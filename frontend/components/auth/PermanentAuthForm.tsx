"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import DatePicker from "react-datepicker";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2Icon, MoveUpRightIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { getBrowser, getDeviceType, getOS } from "@/utils/functions/deviceDetails";
import { signIn } from "next-auth/react";
import Link from "next/link";

interface PermanentAuthFormProps {
	currentIPAddress: string;
}

const LoginSchema = z.object({
	identifier: z.string().min(1, "Username or email is required."),
	password: z.string().min(1, "Password is required."),
});

const RegisterSchema = z.object({
	username: z.string().min(2, {
		message: "Username must be at least 2 characters.",
	}),
	email: z.string().email({
		message: "Please enter a valid email address.",
	}),
	password: z.string().min(6, {
		message: "Password must be at least 6 characters.",
	}),
	dob: z.coerce.date().refine(
		(date) => {
			const age = new Date().getFullYear() - date.getFullYear();
			return age >= 18;
		},
		{
			message: "You must be at least 18 years old.",
		},
	),
	gender: z.enum(["male", "female", "transgender", "couple", "other"], {
		required_error: "Gender is required",
	}),
});

type LoginFormData = z.infer<typeof LoginSchema>;
type RegisterFormData = z.infer<typeof RegisterSchema>;

export default function PermanentAuthForm({ currentIPAddress }: PermanentAuthFormProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<string>("login");

	const loginForm = useForm<LoginFormData>({
		resolver: zodResolver(LoginSchema),
		defaultValues: {
			identifier: "",
			password: "",
		},
	});

	const registerForm = useForm<RegisterFormData>({
		resolver: zodResolver(RegisterSchema),
		defaultValues: {
			username: "",
			email: "",
			password: "",
			dob: undefined,
		},
	});

	const getDeviceMetadata = () => ({
		ipAddress: currentIPAddress,
		currentOS: getOS(),
		browser: getBrowser(),
		deviceType: getDeviceType(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		language: navigator.language,
		userAgent: navigator.userAgent,
	});

	const onLoginSubmit = async (data: LoginFormData) => {
		try {
			const deviceDetails = getDeviceMetadata();
			const result = await signIn("credentials", {
				flow: "permanent-login",
				identifier: data.identifier,
				password: data.password,
				deviceDetails: JSON.stringify(deviceDetails),
				redirect: false,
			});

			if (result?.error) {
				const description =
					result.code && result.code !== "credentials"
						? result.code
						: "Invalid credentials. Please verify your username/email and password.";
				toast.error("Sign In Failed", { description });
				return;
			}

			if (result?.ok) {
				toast.success("Welcome back!", { description: "Signed in successfully." });
				router.push("/available-chatrooms");
				router.refresh();
			}
		} catch (error: any) {
			console.error("Permanent login error:", error);
			toast.error("Sign In Error", { description: error?.message || "Please try again." });
		}
	};

	const onRegisterSubmit = async (data: RegisterFormData) => {
		try {
			const deviceDetails = getDeviceMetadata();
			const result = await signIn("credentials", {
				flow: "permanent-register",
				username: data.username,
				email: data.email,
				password: data.password,
				dob: data.dob.toISOString(),
				gender: data.gender,
				ipAddress: currentIPAddress,
				deviceDetails: JSON.stringify(deviceDetails),
				redirect: false,
			});

			if (result?.error) {
				const description =
					result.code && result.code !== "credentials"
						? result.code
						: "Registration failed. Username or email may already be in use.";
				toast.error("Registration Failed", { description });
				return;
			}

			if (result?.ok) {
				toast.success("Account Created!", { description: "Welcome to ChatterBase!" });
				router.push("/available-chatrooms");
				router.refresh();
			}
		} catch (error: any) {
			console.error("Permanent register error:", error);
			toast.error("Registration Error", { description: error?.message || "Please try again." });
		}
	};

	return (
		<div className="w-full mx-auto sm:w-3/5 border border-border rounded-xl p-4 sm:p-6 shadow-lg bg-card text-card-foreground">
			<div className="flex flex-col items-center text-center mb-6">
				<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
					<ShieldCheckIcon className="w-6 h-6 text-primary" />
				</div>
				<h1 className="text-2xl font-bold tracking-tight">Permanent Account</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Persistent username, profile history, and permanent chat ownership
				</p>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2 mb-6">
					<TabsTrigger value="login">Sign In</TabsTrigger>
					<TabsTrigger value="register">Create Account</TabsTrigger>
				</TabsList>

				<TabsContent value="login">
					<Form {...loginForm}>
						<form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
							<FormField
								control={loginForm.control}
								name="identifier"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username or Email</FormLabel>
										<FormControl>
											<Input placeholder="Enter username or email" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={loginForm.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input type="password" placeholder="Enter password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								className="w-full mt-2"
								disabled={loginForm.formState.isSubmitting}
							>
								{loginForm.formState.isSubmitting ? (
									<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<>
										Sign In <MoveUpRightIcon className="ml-1 h-4 w-4" />
									</>
								)}
							</Button>
						</form>
					</Form>
				</TabsContent>

				<TabsContent value="register">
					<Form {...registerForm}>
						<form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
							<FormField
								control={registerForm.control}
								name="username"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input placeholder="Choose a unique username" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={registerForm.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input type="email" placeholder="name@example.com" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={registerForm.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password (min 6 characters)</FormLabel>
										<FormControl>
											<Input type="password" placeholder="Create a password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={registerForm.control}
								name="dob"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Date of Birth</FormLabel>
										<FormControl>
											<DatePicker
												selected={field.value}
												onChange={(date) => field.onChange(date)}
												dateFormat="dd-MM-yyyy"
												className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
												placeholderText="Select your DOB (18+ required)"
												maxDate={new Date()}
												showMonthDropdown
												showYearDropdown
												dropdownMode="select"
											/>
										</FormControl>
										{registerForm.formState.errors.dob && (
											<p className="text-destructive text-sm">
												{registerForm.formState.errors.dob.message}
											</p>
										)}
									</FormItem>
								)}
							/>

							<FormField
								control={registerForm.control}
								name="gender"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Gender</FormLabel>
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Select your gender" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{["male", "female", "transgender", "couple", "other"].map(
													(gender) => (
														<SelectItem key={gender} value={gender}>
															{gender.charAt(0).toUpperCase() + gender.slice(1)}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								className="w-full mt-2"
								disabled={registerForm.formState.isSubmitting}
							>
								{registerForm.formState.isSubmitting ? (
									<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<>
										Create Account <MoveUpRightIcon className="ml-1 h-4 w-4" />
									</>
								)}
							</Button>
						</form>
					</Form>
				</TabsContent>
			</Tabs>

			<div className="mt-6 pt-4 border-t border-border text-center text-sm text-muted-foreground">
				<p>
					Prefer zero-password anonymous access?{" "}
					<Link href="/guest-login" className="underline font-medium text-foreground hover:text-primary">
						Chat as Guest
					</Link>
				</p>
			</div>
		</div>
	);
}
