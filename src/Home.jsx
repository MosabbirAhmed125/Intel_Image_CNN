import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
	Upload,
	Image as ImageIcon,
	Cpu,
	ScanSearch,
	CheckCircle,
	LoaderCircle,
	X,
	RotateCcw,
	Zap,
	BarChart3,
	Layers,
	CodeXml,
} from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

const MODEL_PERFORMANCE = {
	overallAccuracy: 89.9,
	testLoss: 0.3027,
	trainingTime: "748.99 sec",
	totalSamples: 1690,
	classes: [
		{
			className: "Forest",
			accuracy: 95.3,
			precision: 97,
			recall: 95,
			f1Score: 96,
			support: 412,
		},
		{
			className: "Glacier",
			accuracy: 80.1,
			precision: 92,
			recall: 80,
			f1Score: 86,
			support: 431,
		},
		{
			className: "Sea",
			accuracy: 86.7,
			precision: 88,
			recall: 87,
			f1Score: 88,
			support: 414,
		},
		{
			className: "Street",
			accuracy: 97.7,
			precision: 84,
			recall: 98,
			f1Score: 90,
			support: 433,
		},
	],
};

const SUPPORTED_CLASSES = ["Forest", "Glacier", "Sea", "Street"];

function formatBytes(bytes) {
	if (!bytes) return "";
	const units = ["B", "KB", "MB", "GB"];
	let i = 0;
	let n = bytes;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i++;
	}
	return `${n.toFixed(1)} ${units[i]}`;
}

function formatClassName(value) {
	if (!value) return "Unknown";
	return value
		.replace(/_/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function Home() {
	const [selectedFile, setSelectedFile] = useState(null);
	const [previewUrl, setPreviewUrl] = useState(null);
	const [isPredicting, setIsPredicting] = useState(false);
	const [prediction, setPrediction] = useState(null);
	const [dragActive, setDragActive] = useState(false);
	const [supportedClasses, setSupportedClasses] = useState(SUPPORTED_CLASSES);
	const [showPerformance, setShowPerformance] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => {
		const fetchSupportedClasses = async () => {
			try {
				const response = await fetch(`${API_URL}/health`);
				if (response.ok) {
					const data = await response.json();
					if (data.classes && Array.isArray(data.classes)) {
						const formattedClasses =
							data.classes.map(formatClassName);
						setSupportedClasses(formattedClasses);
					}
				}
			} catch (error) {
				console.debug("Could not fetch supported classes:", error);
			}
		};

		if (API_URL) {
			fetchSupportedClasses();
		}
	}, []);

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	const acceptFile = (file) => {
		if (!file) return;

		const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
		const MAX_FILE_SIZE_MB = 5;
		const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

		if (file.size > MAX_FILE_SIZE_BYTES) {
			toast.error(`Image size must be less than ${MAX_FILE_SIZE_MB} MB.`);
			return;
		}

		if (!allowedTypes.includes(file.type)) {
			toast.error("Only JPG, JPEG, and PNG images are supported.");
			return;
		}

		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setSelectedFile(file);
		setPreviewUrl(URL.createObjectURL(file));
		setPrediction(null);
	};

	const handleFileChange = (e) => {
		const file = e.target.files?.[0];
		acceptFile(file);
		e.target.value = "";
	};

	const handleDrop = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
		const file = e.dataTransfer.files?.[0];
		acceptFile(file);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(true);
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
	};

	const handlePredict = async () => {
		if (!selectedFile) {
			toast.error("Please upload an image first.");
			return;
		}

		if (!API_URL) {
			toast.error("API URL is not configured.");
			return;
		}

		setIsPredicting(true);
		setPrediction(null);
		const toastId = toast.loading("Running CNN inference...");

		try {
			const start = performance.now();

			const formData = new FormData();
			formData.append("file", selectedFile);

			const response = await fetch(`${API_URL}/predict`, {
				method: "POST",
				body: formData,
			});

			const end = performance.now();
			const inferenceTime = Math.round(end - start);

			if (!response.ok) {
				let errorMessage = "Prediction failed. Please try again.";
				try {
					const errorData = await response.json();
					if (errorData.detail) {
						errorMessage = errorData.detail;
					}
				} catch (e) {}
				toast.error(errorMessage, { id: toastId });
				return;
			}

			const data = await response.json();

			const topPredictions = Object.entries(data.all_predictions)
				.map(([label, confidence]) => ({
					label: formatClassName(label),
					confidence: clamp(confidence * 100, 0, 100),
				}))
				.sort((a, b) => b.confidence - a.confidence);

			const prediction = {
				label: formatClassName(data.predicted_class),
				confidence: clamp(data.confidence * 100, 0, 100),
				model: "Intel Scene CNN",
				inferenceTime: `${inferenceTime} ms`,
				topPredictions: topPredictions,
			};

			setPrediction(prediction);
			toast.success(`Predicted: ${prediction.label}`, { id: toastId });
		} catch (error) {
			console.error("Prediction error:", error);
			toast.error("Unable to connect to the prediction API.", {
				id: toastId,
			});
		} finally {
			setIsPredicting(false);
		}
	};

	const handleReset = () => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		setSelectedFile(null);
		setPreviewUrl(null);
		setPrediction(null);
	};

	const features = [
		{
			icon: Zap,
			title: "Fast Inference",
			desc: "Optimized CNN pipeline returns predictions in milliseconds.",
		},
		{
			icon: Layers,
			title: "CNN-Based Classification",
			desc: "Deep convolutional layers trained on Intel Image Dataset.",
		},
		{
			icon: BarChart3,
			title: "Confidence Breakdown",
			desc: "See full probability distribution across all categories.",
		},
	];

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-shark-900 font-ubuntu text-shark-200">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-40 -left-40 h-120 w-120 rounded-full bg-elephant-500/20 blur-[140px]" />
				<div className="absolute top-1/3 -right-40 h-130 w-130 rounded-full bg-elephant-700/25 blur-[160px]" />
				<div className="absolute bottom-0 left-1/2 h-100 w-175 -translate-x-1/2 rounded-full bg-elephant-900/40 blur-[160px]" />
				<div
					className="absolute inset-0 opacity-[0.035]"
					style={{
						backgroundImage:
							"linear-gradient(rgba(155,245,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(155,245,255,0.5) 1px, transparent 1px)",
						backgroundSize: "48px 48px",
						maskImage:
							"radial-gradient(ellipse at center, black 40%, transparent 80%)",
					}}
				/>
				<div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-shark-950/80" />
			</div>

			<div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 xl:py-20">
				<motion.section
					initial="hidden"
					animate="show"
					variants={{
						hidden: {},
						show: { transition: { staggerChildren: 0.12 } },
					}}
					className="flex flex-col items-center text-center"
				>
					<motion.div
						variants={{
							hidden: { opacity: 0, scale: 0.9 },
							show: { opacity: 1, scale: 1 },
						}}
						className="relative"
					>
						<div className="absolute inset-0 -z-10 rounded-full bg-elephant-500/20 blur-2xl" />
						<div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-3 border-elephant-500/30 bg-linear-to-br from-shark-800 to-shark-950 shadow-[0_0_40px_-10px_rgba(11,223,255,0.6)] sm:h-20 sm:w-20">
							<img
								src="/favicon.svg"
								alt="Intel Image CNN Logo"
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</div>
					</motion.div>

					<motion.h1
						variants={{
							hidden: { opacity: 0, y: 20 },
							show: { opacity: 1, y: 0 },
						}}
						className="mt-5 max-w-full text-center text-3xl font-gurvaco tracking-[0.12em] text-shark-100 sm:mt-6 sm:text-5xl sm:tracking-widest lg:text-6xl"
					>
						INTEL{" "}
						<span className="bg-linear-to-r from-elephant-200 via-elephant-400 to-elephant-500 bg-clip-text text-transparent">
							IMAGE CLASSIFIER
						</span>
					</motion.h1>

					<motion.p
						variants={{
							hidden: { opacity: 0, y: 20 },
							show: { opacity: 1, y: 0 },
						}}
						className="mt-4 px-2 text-xs leading-relaxed text-shark-300 sm:text-sm md:text-base"
					>
						Upload a scene image from the supported categories and
						let the CNN model predict its class with confidence.
						Images outside these categories may produce incorrect,
						random, or irrelevant results.
					</motion.p>
				</motion.section>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mt-7 flex flex-col items-center px-2 sm:mt-10"
				>
					<p className="text-xs font-medium font-ubuntu uppercase tracking-[0.2em] text-shark-400">
						Supported Categories
					</p>
					<div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-2 font-ubuntu">
						{supportedClasses.map((c) => (
							<span
								key={c}
								className="rounded-full border border-elephant-500/30 bg-shark-800/60 px-3 py-1.5 text-xs font-medium text-elephant-200 backdrop-blur transition hover:border-elephant-400/60 hover:bg-elephant-500/10 sm:px-4"
							>
								{c}
							</span>
						))}
					</div>
				</motion.div>

				<div className="mt-8 grid w-full grid-cols-1 gap-5 sm:mt-10 lg:mt-12 lg:grid-cols-2 lg:gap-6">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="group relative min-w-0 overflow-hidden rounded-3xl border border-elephant-500/20 bg-shark-800/60 p-4 shadow-[0_0_60px_-20px_rgba(11,223,255,0.35)] backdrop-blur-xl sm:p-6 lg:p-8"
					>
						<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-elephant-400/50 to-transparent" />
						<div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elephant-500/15 text-elephant-400">
									<ImageIcon className="h-5 w-5" />
								</div>
								<div>
									<h2 className="text-lg font-semibold text-shark-100">
										Image Input
									</h2>
									<p className="text-xs text-shark-400">
										Upload a scene to classify
									</p>
								</div>
							</div>
							{selectedFile && (
								<button
									onClick={handleReset}
									className="inline-flex items-center gap-1.5 rounded-lg border border-shark-700 bg-shark-900/60 px-3 py-1.5 text-xs text-shark-300 transition hover:border-elephant-500/40 hover:text-elephant-300"
								>
									<X className="h-3.5 w-3.5" /> Clear
								</button>
							)}
						</div>

						<input
							ref={inputRef}
							type="file"
							accept="image/*"
							onChange={handleFileChange}
							className="hidden"
							aria-label="Upload image"
						/>

						{!previewUrl ? (
							<motion.label
								htmlFor="file-upload"
								onClick={() => inputRef.current?.click()}
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								whileHover={{ scale: 1.005 }}
								className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition sm:px-6 sm:py-14 lg:py-16 ${
									dragActive
										? "border-elephant-400 bg-elephant-500/10"
										: "border-shark-700 bg-shark-900/40 hover:border-elephant-500/50 hover:bg-shark-900/60"
								}`}
							>
								<div className="relative mb-4">
									<div className="absolute inset-0 rounded-full bg-elephant-500/20 blur-xl" />
									<div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-elephant-500/30 bg-shark-800 sm:h-16 sm:w-16">
										<Upload className="h-7 w-7 text-elephant-400" />
									</div>
								</div>
								<p className="text-base font-semibold text-shark-100">
									Upload image
								</p>
								<p className="mt-1 text-sm text-shark-400">
									Click or drag &amp; drop to browse
								</p>
								<p className="mt-3 text-xs text-shark-500">
									PNG, JPG or JPEG · Max 5 MB
								</p>
							</motion.label>
						) : (
							<motion.div
								initial={{ opacity: 0, scale: 0.97 }}
								animate={{ opacity: 1, scale: 1 }}
								className="space-y-4"
							>
								<div className="relative overflow-hidden rounded-2xl border border-shark-700 bg-shark-950">
									<img
										src={previewUrl}
										alt={`Preview of uploaded scene ${selectedFile?.name}`}
										className="h-56 w-full object-cover sm:h-72 lg:h-80"
									/>
									<div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-shark-950/90 to-transparent p-3">
										<p className="truncate text-sm font-medium text-shark-100">
											{selectedFile?.name}
										</p>
										<p className="text-xs text-shark-400">
											{formatBytes(selectedFile?.size)}
										</p>
									</div>
								</div>

								<button
									onClick={() => inputRef.current?.click()}
									className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-shark-700 bg-shark-900/60 px-4 py-2.5 text-sm font-medium text-shark-200 transition hover:border-elephant-500/40 hover:text-elephant-300"
								>
									<RotateCcw className="h-4 w-4" /> Choose
									another image
								</button>
							</motion.div>
						)}

						<motion.button
							whileHover={{
								scale: selectedFile && !isPredicting ? 1.02 : 1,
							}}
							whileTap={{
								scale: selectedFile && !isPredicting ? 0.98 : 1,
							}}
							onClick={handlePredict}
							disabled={!selectedFile || isPredicting}
							className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition sm:mt-6 sm:px-6 sm:py-3.5 ${
								!selectedFile || isPredicting
									? "cursor-not-allowed border border-shark-700 bg-shark-800/60 text-shark-500"
									: "bg-linear-to-r from-elephant-400 via-elephant-500 to-elephant-600 text-shark-950 shadow-[0_0_30px_-5px_rgba(11,223,255,0.6)] hover:shadow-[0_0_40px_-5px_rgba(11,223,255,0.8)]"
							}`}
						>
							{isPredicting ? (
								<>
									<LoaderCircle className="h-5 w-5 animate-spin" />
									Analyzing...
								</>
							) : (
								<>
									<ScanSearch className="h-5 w-5" />
									Predict Image
								</>
							)}
						</motion.button>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.3 }}
						className="group relative min-w-0 overflow-hidden rounded-3xl border border-elephant-500/20 bg-shark-800/60 p-4 shadow-[0_0_60px_-20px_rgba(11,223,255,0.35)] backdrop-blur-xl sm:p-6 lg:p-8"
					>
						<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-elephant-400/50 to-transparent" />
						<div className="mb-5 flex items-center gap-3 sm:mb-6">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elephant-500/15 text-elephant-400">
								<Cpu className="h-5 w-5" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-shark-100">
									Prediction Output
								</h2>
								<p className="text-xs text-shark-400">
									Live CNN classification result
								</p>
							</div>
						</div>

						<AnimatePresence mode="wait">
							{!prediction && !isPredicting && (
								<motion.div
									key="empty"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-shark-700 bg-shark-900/40 px-4 py-12 text-center sm:px-6 sm:py-16 lg:py-20"
								>
									<div className="relative mb-4">
										<div className="absolute inset-0 rounded-full bg-elephant-500/20 blur-xl" />
										<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-elephant-500/30 bg-shark-800">
											<ScanSearch className="h-7 w-7 text-elephant-400" />
										</div>
									</div>
									<p className="text-base font-semibold text-shark-100">
										Prediction results will appear here
									</p>
									<p className="mt-1 max-w-xs text-sm text-shark-400">
										Upload an image and run prediction to
										view the model output.
									</p>
								</motion.div>
							)}

							{isPredicting && (
								<motion.div
									key="loading"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className="flex flex-col items-center justify-center rounded-2xl border border-elephant-500/20 bg-shark-900/40 px-4 py-12 text-center sm:px-6 sm:py-16 lg:py-20"
								>
									<LoaderCircle className="h-10 w-10 animate-spin text-elephant-400" />
									<p className="mt-4 text-sm font-medium text-shark-200">
										Running neural inference...
									</p>
									<p className="mt-1 text-xs text-shark-400">
										Crunching convolutions
									</p>
								</motion.div>
							)}

							{prediction && !isPredicting && (
								<motion.div
									key="result"
									initial={{ opacity: 0, y: 16 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.4 }}
									className="space-y-6"
								>
									<div className="rounded-2xl border border-elephant-500/30 bg-linear-to-br from-elephant-950/80 to-shark-900/80 p-5">
										<div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
											<div>
												<p className="text-xs uppercase tracking-wider text-elephant-300">
													Predicted Class
												</p>
												<h3 className="mt-1 wrap-break-word text-2xl font-bold text-shark-100 sm:text-3xl lg:text-4xl">
													{prediction.label}
												</h3>
											</div>
											{prediction.confidence >= 80 && (
												<span className="inline-flex items-center gap-1 rounded-full border border-elephant-400/40 bg-elephant-500/15 px-3 py-1 text-xs font-medium text-elephant-300">
													<CheckCircle className="h-3.5 w-3.5" />
													High confidence
												</span>
											)}
										</div>

										<div className="mt-5">
											<div className="mb-1.5 flex items-center justify-between text-xs">
												<span className="text-shark-400">
													Confidence
												</span>
												<span className="font-semibold text-elephant-300">
													{prediction.confidence.toFixed(
														1,
													)}
													%
												</span>
											</div>
											<div className="h-2 overflow-hidden rounded-full bg-shark-800">
												<motion.div
													initial={{ width: 0 }}
													animate={{
														width: `${prediction.confidence}%`,
													}}
													transition={{
														duration: 0.9,
														ease: "easeOut",
													}}
													className="h-full rounded-full bg-linear-to-r from-elephant-300 to-elephant-500"
												/>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
										<div className="rounded-xl border border-shark-700 bg-shark-900/60 p-4">
											<p className="text-xs text-shark-400">
												Inference Time
											</p>
											<p className="mt-1 text-lg font-semibold text-shark-100">
												{prediction.inferenceTime}
											</p>
										</div>
										<div className="rounded-xl border border-shark-700 bg-shark-900/60 p-4">
											<p className="text-xs text-shark-400">
												Model
											</p>
											<p className="mt-1 min-w-0 truncate text-lg font-semibold text-shark-100">
												{prediction.model}
											</p>
										</div>
									</div>

									<div>
										<p className="mb-3 text-xs font-medium uppercase tracking-wider text-shark-400">
											Top Predictions
										</p>
										<div className="space-y-3">
											{prediction.topPredictions.map(
												(p, i) => {
													const isTop = i === 0;
													return (
														<div key={p.label}>
															<div className="mb-1 flex items-center justify-between text-sm">
																<span
																	className={`min-w-0 truncate ${
																		isTop
																			? "font-semibold text-elephant-300"
																			: "text-shark-300"
																	}`}
																>
																	{p.label}
																</span>
																<span
																	className={
																		isTop
																			? "ml-2 shrink-0 font-semibold text-elephant-300"
																			: "ml-2 shrink-0 text-shark-400"
																	}
																>
																	{p.confidence.toFixed(
																		1,
																	)}
																	%
																</span>
															</div>
															<div className="h-1.5 overflow-hidden rounded-full bg-shark-800">
																<motion.div
																	initial={{
																		width: 0,
																	}}
																	animate={{
																		width: `${p.confidence}%`,
																	}}
																	transition={{
																		duration: 0.7,
																		delay:
																			i *
																			0.08,
																		ease: "easeOut",
																	}}
																	className={`h-full rounded-full ${
																		isTop
																			? "bg-linear-to-r from-elephant-300 to-elephant-500"
																			: "bg-shark-600"
																	}`}
																/>
															</div>
														</div>
													);
												},
											)}
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				</div>

				<motion.div
					initial="hidden"
					whileInView="show"
					viewport={{ once: true }}
					variants={{
						hidden: {},
						show: { transition: { staggerChildren: 0.12 } },
					}}
					className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
				>
					{features.map((f) => (
						<motion.div
							key={f.title}
							variants={{
								hidden: { opacity: 0, y: 24 },
								show: { opacity: 1, y: 0 },
							}}
							whileHover={{ y: -4 }}
							className="group relative overflow-hidden rounded-2xl border border-shark-700 bg-shark-800/50 p-5 backdrop-blur transition hover:border-elephant-500/40 hover:shadow-[0_0_40px_-10px_rgba(11,223,255,0.4)] sm:p-6"
						>
							<div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-elephant-500/10 blur-2xl transition group-hover:bg-elephant-500/20" />
							<div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-elephant-500/30 bg-shark-900/80 text-elephant-400">
								<f.icon className="h-5 w-5" />
							</div>
							<h3 className="relative mt-4 text-base font-semibold text-shark-100">
								{f.title}
							</h3>
							<p className="relative mt-1.5 text-sm text-shark-400">
								{f.desc}
							</p>
						</motion.div>
					))}
				</motion.div>

				<div className="mt-12 flex justify-center">
					<motion.button
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						onClick={() => setShowPerformance(true)}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-elephant-400 via-elephant-500 to-elephant-600 px-5 py-3 text-sm font-semibold text-shark-950 shadow-[0_0_20px_-6px_rgba(11,223,255,0.55)] transition hover:shadow-[0_0_28px_-6px_rgba(11,223,255,0.75)]"
					>
						<BarChart3 className="h-4 w-4" />
						View Model Performance
					</motion.button>
				</div>

				<a
					href="https://github.com/MosabbirAhmed125"
					target="_blank"
					rel="noopener noreferrer"
					className="mt-16 flex items-center justify-center gap-2 text-xs font-medium text-shark-500 transition hover:text-elephant-300"
				>
					<CodeXml className="h-4 w-4" />
					<span>Built by Mosabbir Ahmed</span>
				</a>

				<AnimatePresence>
					{showPerformance && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							onClick={() => setShowPerformance(false)}
							className="fixed inset-0 z-50 flex items-center justify-center bg-shark-950/75 p-3 backdrop-blur-md sm:p-4"
							role="dialog"
							aria-modal="true"
							aria-labelledby="model-performance-title"
						>
							<motion.div
								initial={{ opacity: 0, scale: 0.94, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.96, y: 20 }}
								transition={{ duration: 0.3 }}
								onClick={(e) => e.stopPropagation()}
								className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto scrollbar-hide overflow-x-hidden rounded-2xl border border-elephant-500/20 bg-shark-800/90 p-4 shadow-[0_0_45px_-20px_rgba(11,223,255,0.3)] backdrop-blur-xl sm:p-5 md:p-6"
							>
								<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-elephant-400/40 to-transparent" />

								<button
									onClick={() => setShowPerformance(false)}
									aria-label="Close model performance modal"
									className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-shark-900/60 text-shark-300 transition hover:bg-shark-800 hover:text-elephant-300"
								>
									<X className="h-4 w-4" />
								</button>

								<div className="mb-5 pr-12">
									<h2
										id="model-performance-title"
										className="text-xl font-semibold text-shark-100 sm:text-2xl"
									>
										Model Performance
									</h2>
									<p className="mt-1 text-xs text-shark-400 sm:text-sm">
										Class-wise accuracy breakdown from the
										evaluation results.
									</p>
								</div>

								<div className="mb-5 rounded-xl border border-elephant-500/20 bg-linear-to-br from-elephant-950/80 to-shark-900/80 p-4">
									<p className="text-[11px] uppercase tracking-wider text-elephant-300">
										Overall Accuracy
									</p>
									<p className="mt-1 text-3xl font-bold text-shark-100 sm:text-4xl">
										{MODEL_PERFORMANCE.overallAccuracy}%
									</p>
								</div>

								<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/50 p-3">
										<p className="text-[11px] text-shark-400">
											Classes Evaluated
										</p>
										<p className="mt-1.5 text-base font-semibold text-shark-100">
											{MODEL_PERFORMANCE.classes.length}
										</p>
									</div>
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/50 p-3">
										<p className="text-[11px] text-shark-400">
											Model
										</p>
										<p className="mt-1.5 truncate text-base font-semibold text-shark-100">
											Intel Scene CNN
										</p>
									</div>
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/50 p-3">
										<p className="text-[11px] text-shark-400">
											Test Samples
										</p>
										<p className="mt-1.5 text-base font-semibold text-shark-100">
											{MODEL_PERFORMANCE.totalSamples}
										</p>
									</div>
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/50 p-3">
										<p className="text-[11px] text-shark-400">
											Test Loss
										</p>
										<p className="mt-1.5 text-base font-semibold text-shark-100">
											{MODEL_PERFORMANCE.testLoss}
										</p>
									</div>
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/50 p-3">
										<p className="text-[11px] text-shark-400">
											Training Time
										</p>
										<p className="mt-1.5 text-base font-semibold text-shark-100">
											{MODEL_PERFORMANCE.trainingTime}
										</p>
									</div>
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/50 p-3">
										<p className="text-[11px] text-shark-400">
											Weighted F1-Score
										</p>
										<p className="mt-1.5 text-base font-semibold text-shark-100">
											0.90
										</p>
									</div>
								</div>

								<div className="mb-4">
									<p className="mb-3 text-[11px] uppercase tracking-wider text-shark-400">
										Class-Wise Accuracy
									</p>
									<div className="rounded-xl border border-shark-700/80 bg-shark-900/40 p-3">
										<ResponsiveContainer
											width="100%"
											height={230}
										>
											<BarChart
												data={MODEL_PERFORMANCE.classes}
												margin={{
													top: 10,
													right: 10,
													left: -15,
													bottom: 0,
												}}
											>
												<CartesianGrid
													strokeDasharray="3 3"
													stroke="rgba(155,245,255,0.1)"
												/>
												<XAxis
													dataKey="className"
													stroke="#a5a5a5"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "11px" }}
												/>
												<YAxis
													domain={[0, 100]}
													stroke="#a5a5a5"
													tickLine={false}
													axisLine={false}
													style={{ fontSize: "11px" }}
												/>
												<Tooltip
													cursor={false}
													contentStyle={{
														backgroundColor:
															"#1a1a1a",
														border: "1px solid #007d9f",
														borderRadius: "10px",
														color: "#00c9eb",
														boxShadow:
															"0 12px 30px rgba(0,0,0,0.35)",
													}}
													formatter={(value) =>
														`${value.toFixed(1)}%`
													}
													labelStyle={{
														color: "#9bf5ff",
													}}
												/>
												<Bar
													dataKey="accuracy"
													fill="#00c9eb"
													radius={[8, 8, 0, 0]}
												/>
											</BarChart>
										</ResponsiveContainer>
									</div>
								</div>

								<p className="text-[11px] leading-relaxed text-shark-500">
									Class-wise accuracy is calculated from the
									confusion matrix as correct predictions
									divided by total actual samples for each
									class.
								</p>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

export default Home;
