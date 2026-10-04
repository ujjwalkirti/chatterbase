import React from "react";
import Link from "next/link";
import {
	ShieldAlertIcon,
	ShieldCheckIcon,
	ScaleIcon,
	FileTextIcon,
	AlertTriangleIcon,
	ArrowLeftIcon,
	MailIcon,
	GlobeIcon,
	LockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
	title: "Terms and Conditions | ChatterBase",
	description:
		"Legal Terms of Service, Intermediary Safe Harbor, Acceptable Use Policy, and Liability Disclaimers for ChatterBase.",
};

export default function TermsAndConditionsPage() {
	return (
		<div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
			<div className="max-w-4xl mx-auto">
				{/* Top Navigation */}
				<div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
					<Link href="/">
						<Button variant="ghost" size="sm" className="gap-2">
							<ArrowLeftIcon className="w-4 h-4" />
							Back to ChatterBase
						</Button>
					</Link>
					<div className="text-xs text-muted-foreground">
						Effective Date: <span className="font-semibold text-foreground">October 5, 2026</span>
					</div>
				</div>

				{/* Header Banner */}
				<div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-10">
					<div className="flex items-center gap-3 text-primary mb-3">
						<ScaleIcon className="w-8 h-8" />
						<span className="text-sm font-semibold uppercase tracking-wider">
							Legal Agreement & Disclaimers
						</span>
					</div>
					<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
						Terms & Conditions of Service
					</h1>
					<p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
						Please read these Terms and Conditions (&quot;Terms&quot;, &quot;Agreement&quot;)
						thoroughly before accessing, registering, or using ChatterBase. By logging in as a guest,
						registering a permanent account, or entering any chatroom, you acknowledge that you have
						read, understood, and unconditionally agree to be legally bound by this Agreement.
					</p>

					<div className="mt-6 flex flex-wrap gap-2 text-xs">
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
							<ShieldCheckIcon className="w-3.5 h-3.5" />
							Intermediary Safe Harbor
						</span>
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
							<AlertTriangleIcon className="w-3.5 h-3.5" />
							18+ Age Restriction
						</span>
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
							<GlobeIcon className="w-3.5 h-3.5" />
							Global & Indian IT Act Compliance
						</span>
					</div>
				</div>

				{/* Quick Navigation Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-sm">
					<a
						href="#safe-harbor"
						className="p-3.5 rounded-lg border border-border bg-card/60 hover:bg-accent/40 transition-colors flex items-center gap-2.5"
					>
						<ShieldAlertIcon className="w-4 h-4 text-primary shrink-0" />
						<span className="font-medium">1. Intermediary Status</span>
					</a>
					<a
						href="#prohibited-conduct"
						className="p-3.5 rounded-lg border border-border bg-card/60 hover:bg-accent/40 transition-colors flex items-center gap-2.5"
					>
						<LockIcon className="w-4 h-4 text-primary shrink-0" />
						<span className="font-medium">2. Prohibited Conduct</span>
					</a>
					<a
						href="#liability"
						className="p-3.5 rounded-lg border border-border bg-card/60 hover:bg-accent/40 transition-colors flex items-center gap-2.5"
					>
						<ScaleIcon className="w-4 h-4 text-primary shrink-0" />
						<span className="font-medium">3. Limitation of Liability</span>
					</a>
				</div>

				{/* Legal Body Sections */}
				<div className="space-y-10 text-sm sm:text-base leading-relaxed text-muted-foreground">
					{/* Section 1 */}
					<section id="binding-agreement" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<FileTextIcon className="w-5 h-5 text-primary" />
							1. Acceptance of Terms & Legal Capacity
						</h2>
						<p className="mb-3">
							These Terms constitute a legally binding electronic agreement between you (&quot;User&quot;,
							&quot;you&quot;, or &quot;your&quot;) and ChatterBase (&quot;Platform&quot;, &quot;we&quot;,
							&quot;us&quot;, or &quot;our&quot;). By creating an account, selecting &quot;Enter Chat&quot; as
							a guest user, or using any part of the service, you affirm that:
						</p>
						<ul className="list-disc pl-6 space-y-2 mb-3">
							<li>
								You are at least <strong>eighteen (18) years of age</strong> (or the age of legal majority
								in your jurisdiction). Persons under 18 years of age are strictly prohibited from using ChatterBase.
							</li>
							<li>
								You possess the full legal right, capacity, and authority to enter into this Agreement.
							</li>
							<li>
								If you do not agree with any part of these Terms, you must immediately terminate your session
								and cease accessing ChatterBase.
							</li>
						</ul>
					</section>

					{/* Section 2 */}
					<section id="safe-harbor" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<ShieldCheckIcon className="w-5 h-5 text-primary" />
							2. Intermediary Status & Safe Harbor Protection
						</h2>
						<div className="p-4 rounded-lg bg-card border border-border mb-4">
							<p className="text-foreground font-semibold mb-2">
								Legal Notice: Intermediary Immunity under Section 79 of the Information Technology Act, 2000
							</p>
							<p className="text-sm">
								ChatterBase functions solely as an electronic communication intermediary and platform provider.
								Under Section 79 of the Information Technology Act, 2000 (India), the Information Technology
								(Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and Section 230 of Title 47 of the
								United States Code (Communications Decency Act), ChatterBase does not initiate transmissions, select
								the receivers of transmissions, or modify or curate user messages transmitted in real-time.
							</p>
						</div>
						<p className="mb-3">
							ChatterBase does not actively monitor, pre-screen, verify, or endorse messages, usernames, or media
							disseminated in chatrooms. All content posted, transmitted, or stored is the sole and exclusive
							responsibility of the originating user.
						</p>
						<p>
							Under no circumstances shall the platform developer, owner, individual maintainers, or host be held
							liable for any defamatory, offensive, harassing, obscene, infringing, or unlawful communications or
							conduct of any user.
						</p>
					</section>

					{/* Section 3 */}
					<section id="prohibited-conduct" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<AlertTriangleIcon className="w-5 h-5 text-amber-500" />
							3. Code of Conduct & Absolute Content Prohibitions
						</h2>
						<p className="mb-3">
							In compliance with Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media
							Ethics Code) Rules, 2021 and international standards, you agree and undertake that you shall not host,
							display, upload, modify, publish, transmit, store, update, or share any information that:
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
							<div className="p-3.5 rounded-lg border border-border bg-card">
								<h3 className="font-semibold text-foreground text-sm mb-1">Harmful & Exploitative Content</h3>
								<p className="text-xs">
									Content that is harmful, harassing, blasphemous, defamatory, obscene, pornographic, pedophilic,
									invasive of another&apos;s privacy, hateful, or racially/ethnically objectionable.
								</p>
							</div>
							<div className="p-3.5 rounded-lg border border-border bg-card">
								<h3 className="font-semibold text-foreground text-sm mb-1">National Security & Public Order</h3>
								<p className="text-xs">
									Content that threatens the unity, integrity, defense, security, or sovereignty of India or any
									friendly nation, public order, or causes incitement to commit any cognizable offense.
								</p>
							</div>
							<div className="p-3.5 rounded-lg border border-border bg-card">
								<h3 className="font-semibold text-foreground text-sm mb-1">Intellectual Property & Fraud</h3>
								<p className="text-xs">
									Infringes any patent, trademark, copyright, or proprietary rights; deceives addressees; or communicates
									grossly offensive or menacing information.
								</p>
							</div>
							<div className="p-3.5 rounded-lg border border-border bg-card">
								<h3 className="font-semibold text-foreground text-sm mb-1">Malicious Software & Impersonation</h3>
								<p className="text-xs">
									Contains software viruses, malware, worms, trojans; attempts unauthorized system access; or impersonates
									any real individual, celebrity, or entity.
								</p>
							</div>
						</div>
						<p>
							Violation of these prohibitions will result in immediate permanent banning, IP blacklisting, message
							purging, and, where mandated by law, immediate referral and cooperation with law enforcement agencies.
						</p>
					</section>

					{/* Section 4 */}
					<section id="guest-and-permanent" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<LockIcon className="w-5 h-5 text-primary" />
							4. Guest Sessions, Permanent Accounts & Data Retention
						</h2>
						<ul className="list-disc pl-6 space-y-2 mb-3">
							<li>
								<strong>Guest / Ephemeral Accounts:</strong> Guest sessions are ephemeral and temporary. Guest
								usernames are protected only during active session presence (governed by Redis atomic locking and
								periodic heartbeats). Upon browser closure, tab exit, or explicit logout, the username is released
								and may be claimed by any other user.
							</li>
							<li>
								<strong>Permanent Accounts:</strong> Permanent user accounts are registered with email, username, and
								cryptographically hashed passwords. Permanent usernames are uniquely reserved in perpetuity.
							</li>
							<li>
								<strong>Message Persistence:</strong> Messages transmitted in public chatrooms become part of the
								permanent room transcript. Messages may persist even after guest username recycling or account
								deletion. You agree not to transmit sensitive personal information, credentials, financial details,
								or confidential data into any chatroom.
							</li>
							<li>
								<strong>Device & Technical Telemetry:</strong> To prevent spam, abuse, and automated attacks, ChatterBase
								logs device metadata (IP address, operating system, browser engine, screen specifications, timezone).
								By using the service, you consent to this essential fraud-prevention processing.
							</li>
						</ul>
					</section>

					{/* Section 5 */}
					<section id="disclaimer" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<AlertTriangleIcon className="w-5 h-5 text-amber-500" />
							5. &quot;AS-IS&quot; & &quot;AS-AVAILABLE&quot; Warranty Disclaimer
						</h2>
						<div className="p-4 rounded-lg bg-card border border-border text-foreground text-xs sm:text-sm font-mono uppercase tracking-wide">
							CHATTERBASE IS PROVIDED STRICTLY ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT
							WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO
							IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY,
							NON-INFRINGEMENT, UNINTERRUPTED UPTIME, SECURITY, OR FREEDOM FROM VIRUSES OR DEFECTS. YOUR USE OF
							CHATTERBASE IS AT YOUR SOLE RISK.
						</div>
					</section>

					{/* Section 6 */}
					<section id="liability" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<ScaleIcon className="w-5 h-5 text-primary" />
							6. Absolute Limitation of Liability
						</h2>
						<p className="mb-3">
							To the maximum extent permitted by applicable law, in no event shall ChatterBase, its individual creator,
							software developers, maintainers, affiliates, directors, employees, or hosting providers be liable for:
						</p>
						<ul className="list-disc pl-6 space-y-2 mb-3">
							<li>
								Any indirect, punitive, incidental, special, consequential, or exemplary damages, including damages for
								loss of profits, goodwill, data, business interruption, or emotional distress.
							</li>
							<li>
								Any errors, mistakes, or inaccuracies of chatroom content, or personal injury or property damage
								resulting from your access to or use of the platform.
							</li>
							<li>
								Any unauthorized access to our servers, infrastructure, or transmitted communications.
							</li>
							<li>
								Any defamatory, harassing, or illegal conduct of any third-party user.
							</li>
						</ul>
						<p>
							In all events, the total cumulative aggregate liability of ChatterBase and its developers arising out of or
							relating to this Agreement shall be strictly capped at <strong>INR ₹100 (One Hundred Indian Rupees)</strong>{" "}
							or <strong>USD $1.00</strong>, whichever is lesser.
						</p>
					</section>

					{/* Section 7 */}
					<section id="indemnification" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<ShieldAlertIcon className="w-5 h-5 text-primary" />
							7. User Indemnification (&quot;Hold Harmless&quot;)
						</h2>
						<p className="mb-3">
							You unconditionally agree to defend, indemnify, and hold harmless ChatterBase, its developer(s),
							contributors, operators, and hosts from and against any and all claims, liabilities, damages, losses,
							proceedings, fines, costs, or expenses (including reasonable attorneys&apos; fees and court costs)
							arising out of or resulting from:
						</p>
						<ul className="list-disc pl-6 space-y-2">
							<li>Your access to or use of the Platform;</li>
							<li>Any message, text, link, username, or content you submit or transmit;</li>
							<li>Your breach or alleged breach of any provision of these Terms;</li>
							<li>Your violation of any applicable law or any third-party rights, including privacy or intellectual property rights.</li>
						</ul>
					</section>

					{/* Section 8 */}
					<section id="governing-law" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<GlobeIcon className="w-5 h-5 text-primary" />
							8. Governing Law, Jurisdiction & Dispute Resolution
						</h2>
						<p className="mb-3">
							This Agreement and any dispute, controversy, or claim arising out of or related to ChatterBase shall be
							governed by and construed in accordance with the <strong>laws of the Republic of India</strong>, without
							giving effect to any principles of conflict of laws.
						</p>
						<p className="mb-3">
							You irrevocably and unconditionally consent to the <strong>exclusive jurisdiction and venue of the competent
							courts in New Delhi, India</strong> (or the platform creator&apos;s designated jurisdiction in India) for all
							legal actions, suits, or arbitrations.
						</p>
						<p>
							<strong>International Users:</strong> If you access ChatterBase from outside the territory of India (including
							the United States, European Union, United Kingdom, or Canada), you do so on your own volition and at your own
							exclusive risk. You agree that ChatterBase is directed solely from India and that you waive any right to claim
							jurisdiction or class action recourse under foreign jurisdictions.
						</p>
					</section>

					{/* Section 9 */}
					<section id="grievance-contact" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
							<MailIcon className="w-5 h-5 text-primary" />
							9. Grievance Redressal & DMCA Takedown Contact
						</h2>
						<p className="mb-3">
							In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code)
							Rules, 2021, and the Digital Millennium Copyright Act (17 U.S.C. § 512), any complaint, grievance, or
							infringement notice regarding user-generated content may be transmitted to our designated Grievance Officer:
						</p>
						<div className="p-4 rounded-lg bg-card border border-border">
							<p className="text-sm font-semibold text-foreground">Grievance & Legal Officer — ChatterBase</p>
							<p className="text-sm mt-1">
								Email: <a href="mailto:grievance@chatterbase.app" className="text-primary underline">grievance@chatterbase.app</a>
							</p>
							<p className="text-xs text-muted-foreground mt-2">
								Please provide exact timestamps, roomId, sender username, and URL/evidence for expedited review and action.
							</p>
						</div>
					</section>

					{/* Section 10 */}
					<section id="modifications" className="scroll-mt-16">
						<h2 className="text-xl font-bold text-foreground mb-3">10. Modifications to Terms</h2>
						<p>
							We reserve the right to revise or update these Terms at any time without prior individual notification.
							The updated version will be indicated by a revised &quot;Effective Date&quot; at the top of this page. Your
							continued use of ChatterBase following the posting of revised Terms signifies your complete acceptance of
							the modified terms.
						</p>
					</section>
				</div>

				{/* Bottom Footer Back */}
				<div className="mt-14 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
					<p className="text-xs text-muted-foreground">
						&copy; {new Date().getFullYear()} ChatterBase. All rights reserved.
					</p>
					<Link href="/">
						<Button variant="outline" size="sm">
							Return to Home Page
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
