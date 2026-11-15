import * as ort from "onnxruntime-web";
import classNames from "../../public/class_names.json";

ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1;

const MODEL_URL = "/model7_se_adv_robust_int8.onnx";
const IMAGE_SIZE = 150;

let sessionPromise = null;

function getSession() {
	if (!sessionPromise) {
		sessionPromise = ort.InferenceSession.create(MODEL_URL, {
			executionProviders: ["wasm"],
			graphOptimizationLevel: "all",
		}).catch((error) => {
			sessionPromise = null;
			throw error;
		});
	}
	return sessionPromise;
}

export async function preloadModel() {
	try {
		await getSession();
	} catch (error) {
		console.debug("Model preload deferred:", error);
	}
}

async function decodeImageToCanvas(file, ctx) {
	if (typeof createImageBitmap === "function") {
		try {
			const bitmap = await createImageBitmap(file);
			try {
				ctx.drawImage(bitmap, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
				return;
			} finally {
				bitmap.close();
			}
		} catch {
			// Fall back to HTMLImageElement decoding if createImageBitmap fails
		}
	}

	const objectUrl = URL.createObjectURL(file);
	try {
		await new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
				resolve();
			};
			img.onerror = () =>
				reject(new Error("Failed to decode uploaded image."));
			img.src = objectUrl;
		});
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

async function preprocessImage(file) {
	const canvas = document.createElement("canvas");
	canvas.width = IMAGE_SIZE;
	canvas.height = IMAGE_SIZE;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Could not initialize 2D canvas context.");
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	await decodeImageToCanvas(file, ctx);

	const { data } = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
	const floatData = new Float32Array(1 * IMAGE_SIZE * IMAGE_SIZE * 3);

	let dstIdx = 0;
	for (let srcIdx = 0; srcIdx < data.length; srcIdx += 4) {
		floatData[dstIdx++] = data[srcIdx] / 255.0;
		floatData[dstIdx++] = data[srcIdx + 1] / 255.0;
		floatData[dstIdx++] = data[srcIdx + 2] / 255.0;
	}

	return new ort.Tensor("float32", floatData, [1, IMAGE_SIZE, IMAGE_SIZE, 3]);
}

function normalizeProbabilities(raw) {
	const sum = raw.reduce((acc, val) => acc + val, 0);
	if (sum >= 0.98 && sum <= 1.02 && raw.every((val) => val >= 0)) {
		return raw;
	}

	const maxVal = Math.max(...raw);
	const exps = raw.map((val) => Math.exp(val - maxVal));
	const sumExp = exps.reduce((acc, val) => acc + val, 0);
	return exps.map((val) => val / sumExp);
}

export async function runBrowserInference(file) {
	const [session, inputTensor] = await Promise.all([
		getSession(),
		preprocessImage(file),
	]);

	const inputName = session.inputNames[0] || "input_tensor";
	const outputName = session.outputNames[0] || "dense_1";

	let outputTensor = null;
	let raw = null;

	try {
		const results = await session.run({ [inputName]: inputTensor });
		outputTensor = results[outputName];
		raw = Array.from(outputTensor.data);
	} finally {
		inputTensor.dispose?.();
		outputTensor?.dispose?.();
	}

	const probs = normalizeProbabilities(raw);

	let bestIdx = 0;
	for (let i = 1; i < probs.length; i++) {
		if (probs[i] > probs[bestIdx]) {
			bestIdx = i;
		}
	}

	const all_predictions = {};
	classNames.forEach((clsName, idx) => {
		all_predictions[clsName] = Number((probs[idx] ?? 0).toFixed(4));
	});

	return {
		predicted_class: classNames[bestIdx],
		confidence: Number(probs[bestIdx].toFixed(4)),
		all_predictions,
	};
}
