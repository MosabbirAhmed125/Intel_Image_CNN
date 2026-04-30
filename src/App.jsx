import "./index.css";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Home from "./Home";

function App() {
	const toasterOptions = {
		className: "font-ubuntu font-bold",
		style: {
			background: "#e5e6e5",
			color: "#1a1a1a",
			border: "none",
		},

		success: {
			iconTheme: {
				primary: "#275ca2",
				secondary: "#e5e6e5",
			},
			style: {
				boxShadow: `
					0 0 0 2px rgba(39,92,162,0.15),
					0 6px 18px rgba(39,92,162,0.35),
					0 2px 6px rgba(0,0,0,0.2)
				`,
			},
		},

		error: {
			iconTheme: {
				primary: "#e53945",
				secondary: "#e5e6e5",
			},
			style: {
				boxShadow: `
					0 0 0 2px rgba(229,57,69,0.15),
					0 6px 18px rgba(229,57,69,0.35),
					0 2px 6px rgba(0,0,0,0.2)
				`,
			},
		},

		loading: {
			iconTheme: {
				primary: "#1a1a1a",
				secondary: "#e5e6e5",
			},
		},
	};

	return (
		<div>
			<Toaster position="top-center" toastOptions={toasterOptions} />

			<Routes>
				<Route path="/" element={<Home></Home>} />
			</Routes>
		</div>
	);
}

export default App;
