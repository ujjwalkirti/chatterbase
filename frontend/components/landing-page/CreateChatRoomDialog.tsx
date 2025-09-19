"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

const formSchema = z.object({
	name: z.string({ required_error: "Name is required" }),
	// this is enum
	type: z.enum(["group", "private"], { required_error: "Chat room type is required" }),
});

function CreateChatRoomDialog() {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			type: "group",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			const response = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/chatroom/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ chatRoomDetails: values }),
			});

			const data = await response.json();

			console.log(data);

			if (data.success) {
				toast(data.message);
				window.location.href = `/chatrooms/${data.data._id}`;
			} else {
				toast("Something went wrong!", { description: data.message });
			}
		} catch (error) {
			toast("Something went wrong!", { description: "Internal Server Error" });
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className="w-[100px] mx-auto cursor-pointer">Create here</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="flex flex-col items-start">
					<DialogTitle>Create Chat Room</DialogTitle>
					<DialogDescription className="w-full text-start">Here you can create your own chat room, for your own interest.</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-8">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Chat Room Name" {...field} />
									</FormControl>
									<FormDescription>This is your chat room name.</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Select Chat Room Type</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl className="w-full">
											<SelectTrigger>
												<SelectValue placeholder="Select Chat Room Type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent className="w-full">
											{["group", "private"].map((chatRoomType) => (
												<SelectItem key={chatRoomType} value={chatRoomType} className="w-full">
													{chatRoomType}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full">
							Submit
						</Button>
					</form>
				</Form>
				<DialogFooter className="sm:justify-start">
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default CreateChatRoomDialog;
