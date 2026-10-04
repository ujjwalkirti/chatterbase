"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import DatePicker from "react-datepicker";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2Icon, MessagesSquareIcon, MoveUpRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { getBrowser, getDeviceType, getOS } from "@/utils/functions/deviceDetails";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

interface LoginFormProps {
	currentIPAddress: string;
}

const FormSchema = z.object({
	username: z.string().min(2, {
		message: "Username must be at least 2 characters.",
	}),
	dob: z.coerce.date().refine(
		(date) => {
			const age = new Date().getFullYear() - date.getFullYear();
			return age > 18;
		},
		{
			message: "You must be at least 18 years old.",
		},
	),
	gender: z.enum(["male", "female", "transgender", "couple", "other"], {
		required_error: "Gender is required",
	}),
	agreeToTerms: z.boolean().refine((val) => val === true, {
		message: "You must agree to the Terms and Conditions to proceed.",
	}),
});

type FormData = z.infer<typeof FormSchema>;

export default function LoginForm({ currentIPAddress }: LoginFormProps) {
	const router = useRouter();
	const form = useForm<FormData>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			username: "",
			dob: undefined,
			agreeToTerms: false,
		},
	});

	const onSubmit = async (data: FormData) => {
		const { username, dob, gender } = data;

		try {
			const deviceDetails = {
				ipAddress: currentIPAddress,
				currentOS: getOS(),
				browser: getBrowser(),
				deviceType: getDeviceType(),
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				language: navigator.language,
				userAgent: navigator.userAgent,
			};

			const result = await signIn("credentials", {
				flow: "guest",
				username,
				dob: dob.toISOString(),
				gender,
				ipAddress: currentIPAddress,
				deviceDetails: JSON.stringify(deviceDetails),
				redirect: false,
			});

			if (result?.error) {
				const description = result.code && result.code !== "credentials" ? result.code : "Registration failed. Please try again.";
				toast.error("Registration Failed", { description });
				return;
			}

			if (result?.ok) {
				toast.success("Registration Successful", { description: "Welcome to Chatter Base!" });
				router.push("/available-chatrooms");
				router.refresh();
			}
		} catch (error: any) {
			console.error(error);
			toast.error("Registration Failed", { description: error?.message || "Please try again" });
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="w-full mx-auto sm:w-3/5 space-y-6 border border-gray-200 rounded-md p-2 sm:p-5 shadow-md">
				<MessagesSquareIcon className="mx-auto w-10 h-10 mt-5" />
				<FormField
					control={form.control}
					name="username"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Username</FormLabel>
							<FormControl>
								<Input placeholder="Username" {...field} />
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
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
									placeholderText="Select your DOB"
									maxDate={new Date()}
									showMonthDropdown
									showYearDropdown
									dropdownMode="select"
								/>
							</FormControl>
							{form.formState.errors.dob && <p className="text-destructive text-sm">{form.formState.errors.dob.message}</p>}
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
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
									{["male", "female", "transgender", "couple", "other"].map((gender) => (
										<SelectItem key={gender} value={gender}>
											{gender}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="agreeToTerms"
					render={({ field }) => (
						<FormItem className="flex items-start gap-3 rounded-lg border border-border p-3 sm:p-4 bg-muted/20">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
									id="guest-terms-agreement"
									className="mt-0.5 shrink-0"
								/>
							</FormControl>
							<div className="flex-1 space-y-1.5 leading-normal">
								<FormLabel htmlFor="guest-terms-agreement" className="text-xs sm:text-sm font-normal cursor-pointer text-muted-foreground block select-none leading-relaxed">
									I confirm that I am at least 18 years old and agree to the{" "}
									<Link
										href="/terms"
										target="_blank"
										className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
									>
										Terms & Conditions
									</Link>
									, including Intermediary Safe Harbor & Liability Disclaimers.
								</FormLabel>
								<FormMessage />
							</div>
						</FormItem>
					)}
				/>
				<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
					{form.formState.isSubmitting ? (
						<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<>
							Enter Chat <MoveUpRightIcon />
						</>
					)}
				</Button>

				<div className="flex gap-1 ">
					<p>You are logging in as guest, to get a permanent account </p> <Link className="underline" href={"/permanent-login"}>Click Here </Link>
				</div>
			</form>
		</Form>
	);
}
