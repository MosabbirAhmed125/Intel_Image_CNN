# Intel Image Classifier — Client-Side Adversarially-Robust CNN

A 100% browser-based deep learning scene classification web application powered by **ONNX Runtime Web (`onnxruntime-web`)**, **React 19**, **Vite**, and **Tailwind CSS v4**[cite: 10].

The application runs an **INT8-quantized Squeeze-and-Excitation Adversarially-Robust Hybrid CNN (`model7_se_adv_robust_int8.onnx`)** directly inside the user's browser via WebAssembly—eliminating external inference servers, API cold starts, and network latency while keeping uploaded images completely private on the client device[cite: 1, 3, 14].

---

## Key Features

- **100% Client-Side Browser Inference:** Executes neural network forward passes locally in WebAssembly (`onnxruntime-web`) with zero backend API calls[cite: 13, 14].
- **75% Compressed INT8 Model:** Dynamically quantized from 41.96 MB (FP32) down to **10.51 MB (INT8)** with **0.00% accuracy drop** (`84.02%` test accuracy) and **99.72% prediction parity**.
- **Adversarial & Distribution-Shift Robustness:** Trained with Squeeze-and-Excitation (SE) channel attention and multi-perturbation robustness against $L_\infty$ PGD, $L_1$ SLIDE, and unseen Affine transformations[cite: 1, 13, 16].
- **Self-Hosted WebAssembly Engine:** Automatically copies matching `.wasm` and `.mjs` runtime binaries into `public/ort/` via `postinstall` for offline capability and zero external CDN dependencies[cite: 3, 10, 14].
- **Interactive Performance Diagnostics:** Includes an in-app performance modal displaying clean vs. adversarial metrics, ROC-AUC, and a Recharts class-wise accuracy breakdown across all 6 Intel scene categories[cite: 13].

---

## Supported Categories

| Class | Test Samples | Clean Accuracy |
| :--- | :---: | :---: |
| **Buildings**[cite: 13] | 392[cite: 13] | 79.08%[cite: 13] |
| **Forest**[cite: 13] | 411[cite: 13] | 97.32%[cite: 13] |
| **Glacier**[cite: 13] | 431[cite: 13] | 84.69%[cite: 13] |
| **Mountain**[cite: 13] | 454[cite: 13] | 77.09%[cite: 13] |
| **Sea**[cite: 13] | 415[cite: 13] | 77.59%[cite: 13] |
| **Street**[cite: 13] | 432[cite: 13] | 88.66%[cite: 13] |

---

## Model Architecture & Benchmarks

### SE-Robust Hybrid CNN (`Model 7`)
- **Input Shape:** `(1, 150, 150, 3)` RGB normalized to `[0.0, 1.0]`[cite: 1, 14]
- **Backbone:** 3-Block Convolutional Neural Network (`64 → 128 → 256` filters) with a Squeeze-and-Excitation (`r = 16`) channel attention block on Block 3 features, SpatialDropout2D (`0.2`), and a regularized Dense (`128`) classification head (`10,996,742` parameters)[cite: 1].
- **Quantization:** Dynamic `QUInt8` weight quantization (`model7_se_adv_robust_int8.onnx`)[cite: 3].

### Evaluation Summary (2,535 Standard Test Samples)

| Metric | FP32 Base (`41.96 MB`) | INT8 Quantized (`10.51 MB`) |
| :--- | :---: | :---: |
| **Clean Test Accuracy** | 84.02%[cite: 16] | **84.02%**[cite: 13] |
| **Weighted F1-Score** | 83.97%[cite: 16] | **83.98%**[cite: 13] |
| **Weighted ROC-AUC** | 0.9740[cite: 16] | **0.9739**[cite: 13] |
| **Test Cross-Entropy Loss** | 0.5287[cite: 16] | **0.5301**[cite: 13] |
| **PGD Robust Accuracy ($L_\infty$)** | 50.49%[cite: 16] | **45.56% – 50.49%**[cite: 13, 16] |
| **SLIDE Robust Accuracy ($L_1$)** | 83.55%[cite: 16] | **83.43% – 83.55%**[cite: 13, 16] |

---

## Project Structure

```text
intel-image-cnn/
├── public/
│   ├── ort/                              # Auto-populated .wasm & .mjs binaries (gitignored)
│   ├── model7_se_adv_robust_int8.onnx    # 10.51 MB INT8 quantized ONNX model
│   ├── class_names.json                  # Ordered class label mapping
│   └── favicon.svg
├── src/
│   ├── utils/
│   │   └── onnxInference.js              # Singleton WASM session, canvas preprocessing & tensor cleanup
│   ├── App.jsx                           # Router & toast notification configuration
│   ├── Home.jsx                          # Main UI, drag-and-drop upload, inference & performance modal
│   ├── index.css                         # Tailwind CSS v4 theme tokens & custom fonts
│   └── main.jsx                          # React entry point
├── package.json                          # Includes postinstall script to copy ORT WASM binaries
├── vite.config.js                        # Dev server middleware for static /ort/ WASM serving
└── vercel.json                           # Vercel SPA deployment configuration
```

---

## Local Setup & Development

### Prerequisites
- **Node.js** `v18+` and **npm**

### Installation & Running Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/MosabbirAhmed125/intel-image-cnn.git](https://github.com/MosabbirAhmed125/intel-image-cnn.git)
   cd intel-image-cnn
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(The `postinstall` script automatically copies the required `.wasm` and `.mjs` files from `node_modules/onnxruntime-web/dist/` into `public/ort/`[cite: 10].)*

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm run preview
   ```

---

## Deployment (Vercel)

This project requires **zero environment variables** and **zero backend services**:
1. Push the repository to GitHub.
2. Import the repository into **Vercel** (Framework Preset: `Vite`).
3. Vercel automatically runs `npm install` (populating `public/ort/`), builds `dist/`, and serves the static app alongside the 10.51 MB ONNX model from its global Edge CDN[cite: 3, 10].

---

## Author

Built by **[Mosabbir Ahmed](https://github.com/MosabbirAhmed125)**[cite: 13]