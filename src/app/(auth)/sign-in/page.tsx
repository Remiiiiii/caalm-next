"use client";

import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

const SignIn = () => {
	return (
		<div className="w-full max-w-[580px]">
			<Suspense fallback={null}>
				<AuthForm type="sign-in" />
			</Suspense>
		</div>
	);
};

export default SignIn;
