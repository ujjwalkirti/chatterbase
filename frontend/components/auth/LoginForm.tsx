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
		}
	),
	gender: z.enum(["male", "female", "transgender", "couple", "other"], {
		required_error: "Gender is required",
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
		},
	});

	const onSubmit = async (data: FormData) => {
		const { username, dob, gender } = data;

		try {
			const response: any = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					dob,
					gender,
					deviceDetails: {
						ipAddress: currentIPAddress,
						currentOS: getOS(),
						browser: getBrowser(),
						deviceType: getDeviceType(),
						timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
						language: navigator.language,
						userAgent: navigator.userAgent,
					},
				}),
			});
			const data = await response.json();
			if (data.success) {
				toast("Registration Successful", { description: data.message });
				localStorage.setItem("chatter_base_token", data.data.token);
				// get last url if stored in localstorage
				const lastUrl = localStorage.getItem("lastUrl");
				if (lastUrl) {
					router.push(lastUrl);
					return;
				}
				router.push("/available-chatrooms");
				return;
			}
			toast("Registration Failed", { description: data.message });

		} catch (error: any) {
			console.log(error);
			toast("Registration Failed", { description: "Please try again" });
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
				<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
					{form.formState.isSubmitting ? (
						<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<>
							Enter Chat <MoveUpRightIcon />
						</>
					)}
				</Button>
			</form>
		</Form>
	);
}
