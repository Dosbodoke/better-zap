"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Github } from "lucide-react";
import Link from "next/link";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ContributorInfo } from "@/lib/community-stats";
import { cn } from "@/lib/utils";
import { TrustedBy } from "./trusted-by";

const cliCommands = [
	{ name: "npm", command: "npm install better-zap" },
	{ name: "yarn", command: "yarn add better-zap" },
	{ name: "pnpm", command: "pnpm add better-zap" },
	{ name: "bun", command: "bun add better-zap" },
];

const mcpCommands = [
	{ name: "Cursor", command: "npx zap mcp --cursor" },
	{
		name: "Claude Code",
		command:
			"claude mcp add --transport http better-zap https://mcp.inkeep.com/better-zap/mcp",
	},
	{ name: "Open Code", command: "npx zap mcp --open-code" },
	{ name: "Manual", command: "npx zap mcp --manual" },
];

const aiPromptText = `Set up WhatsApp integration in my Next.js project using Better Zap (better-zap npm package).

1. Install better-zap.

2. Create app/api/zap/[...all]/route.ts — this will be my catch-all route for webhooks.
   - Import { zapHandler } from "better-zap/next"
   - Export the GET and POST handlers

3. Initialize the Zap SDK in lib/zap.ts:
   - Use your WhatsApp Business API credentials (API Key, Phone Number ID)
   - Export the zap instance to use across the app

4. Show me how to send a simple "Hello World" message using the SDK.

5. How do I listen for incoming messages in the catch-all route?

Refer to better-zap.com/docs for exact API and webhook configuration.`;

function InstallBlock() {
	const [mode, setMode] = useState<"cli" | "prompt" | "mcp" | "skills">("cli");
	const [copied, setCopied] = useState(false);
	const [pmOpen, setPmOpen] = useState(false);
	const [promptOpen, setPromptOpen] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const [contentHeight, setContentHeight] = useState<number | "auto">("auto");
	const [overflow, setOverflow] = useState<"hidden" | "visible">("visible");

	useEffect(() => {
		const el = contentRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			setContentHeight(el.offsetHeight);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useLayoutEffect(() => {
		setOverflow("hidden");
	}, [mode]);

	useLayoutEffect(() => {
		if (pmOpen) {
			setOverflow("visible");
		}
	}, [pmOpen]);

	const copy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setPmOpen(false);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="mb-6 rounded-md border border-foreground/[0.1] relative">
			{/* Tabs */}
			<div className="flex items-center border-b border-foreground/[0.1]">
				<button
					onClick={() => {
						setMode("cli");
						setCopied(false);
						setPmOpen(false);
					}}
					className={cn(
						"px-4 py-2 text-[12px] transition-colors duration-150 relative",
						mode === "cli"
							? "text-neutral-800 dark:text-neutral-200"
							: "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400",
					)}
				>
					CLI
					{mode === "cli" && (
						<div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-neutral-600 dark:bg-neutral-400" />
					)}
				</button>
				<button
					onClick={() => {
						setMode("prompt");
						setCopied(false);
						setPmOpen(false);
					}}
					className={cn(
						"px-4 py-2 text-[12px] transition-colors duration-150 relative",
						mode === "prompt"
							? "text-neutral-800 dark:text-neutral-200"
							: "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400",
					)}
				>
					Prompt
					{mode === "prompt" && (
						<div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-neutral-600 dark:bg-neutral-400" />
					)}
				</button>
				<button
					onClick={() => {
						setMode("mcp");
						setCopied(false);
						setPmOpen(false);
					}}
					className={cn(
						"px-4 py-2 text-[12px] transition-colors duration-150 relative",
						mode === "mcp"
							? "text-neutral-800 dark:text-neutral-200"
							: "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400",
					)}
				>
					MCP
					{mode === "mcp" && (
						<div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-neutral-600 dark:bg-neutral-400" />
					)}
				</button>
				<button
					onClick={() => {
						setMode("skills");
						setCopied(false);
						setPmOpen(false);
					}}
					className={cn(
						"px-4 py-2 text-[12px] transition-colors duration-150 relative",
						mode === "skills"
							? "text-neutral-800 dark:text-neutral-200"
							: "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400",
					)}
				>
					Skills
					{mode === "skills" && (
						<div className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-neutral-600 dark:bg-neutral-400" />
					)}
				</button>
			</div>

			{/* Content */}
			<motion.div
				animate={{ height: contentHeight }}
				initial={false}
				transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
				onAnimationComplete={() => setOverflow("visible")}
				style={{ overflow }}
			>
				<div ref={contentRef}>
					<AnimatePresence mode="wait" initial={false}>
						<div>
							{mode === "cli" || mode === "skills" ? (
								<div className="flex items-center justify-between bg-neutral-100/50 dark:bg-[#050505] px-4 py-3">
									<code
										className="text-[13px]"
										style={{ fontFamily: "var(--font-geist-pixel-square)" }}
									>
										{mode === "skills" ? (
											<>
												<span className="text-purple-600/90 dark:text-purple-400/90">
													npx
												</span>{" "}
												<span className="text-neutral-700 dark:text-neutral-300">
													skills add better-zap/skills
												</span>
											</>
										) : (
											<>
												<span className="text-purple-600/90 dark:text-purple-400/90">
													pnpm
												</span>{" "}
												<span className="text-neutral-700 dark:text-neutral-300">
													add better-zap
												</span>
											</>
										)}
									</code>
									<div className="relative">
										{mode === "skills" ? (
											<button
												onClick={() =>
													copy("npx skills add better-zap/skills")
												}
												className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1"
												aria-label="Copy command"
											>
												{copied ? (
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														className="h-4 w-4"
													>
														<path
															fill="currentColor"
															d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"
														/>
													</svg>
												) : (
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														className="h-4 w-4"
													>
														<path
															fill="currentColor"
															d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"
														/>
													</svg>
												)}
											</button>
										) : (
											<>
												<button
													onClick={() => {
														if (copied) return;
														setPmOpen(!pmOpen);
													}}
													className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1"
													aria-label="Copy command"
												>
													{copied ? (
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 24 24"
															className="h-4 w-4"
														>
															<path
																fill="currentColor"
																d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"
															/>
														</svg>
													) : (
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 24 24"
															className="h-4 w-4"
														>
															<path
																fill="currentColor"
																d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"
															/>
														</svg>
													)}
												</button>
												{pmOpen && (
													<>
														<div
															className="fixed inset-0 z-40"
															role="button"
															tabIndex={-1}
															aria-label="Close dropdown"
															onClick={() => setPmOpen(false)}
															onKeyDown={(e) => {
																if (e.key === "Escape") setPmOpen(false);
															}}
														/>
														<div className="absolute right-0 top-full mt-2 w-[138px] bg-white dark:bg-[#050505] border border-neutral-200 dark:border-white/[0.07] shadow-2xl shadow-black/10 dark:shadow-black/80 z-50 rounded-sm">
															{cliCommands.map((pm, i) => (
																<button
																	key={pm.name}
																	onClick={() => copy(pm.command)}
																	className={cn(
																		"flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-all text-left",
																		i < cliCommands.length - 1 &&
																			"border-b border-neutral-100 dark:border-white/[0.06]",
																	)}
																>
																	<span className="font-mono text-[11px]">
																		{pm.command.split(" ")[0]}
																	</span>
																</button>
															))}
														</div>
													</>
												)}
											</>
										)}
									</div>
								</div>
							) : mode === "mcp" ? (
								<div className="flex items-center justify-between bg-neutral-100/50 dark:bg-[#050505] px-4 py-3">
									<code
										className="text-[13px] truncate"
										style={{ fontFamily: "var(--font-geist-pixel-square)" }}
									>
										<span className="text-purple-600/90 dark:text-purple-400/90">
											npx
										</span>{" "}
										<span className="text-neutral-700 dark:text-neutral-300">
											zap mcp
										</span>
									</code>
									<div className="relative">
										<button
											onClick={() => {
												if (copied) return;
												setPmOpen(!pmOpen);
											}}
											className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1"
											aria-label="Add MCP"
										>
											{copied ? (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													className="h-4 w-4"
												>
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"
													/>
												</svg>
											) : (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													className="h-4 w-4"
												>
													<path
														fill="currentColor"
														d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"
													/>
												</svg>
											)}
										</button>
										{pmOpen && (
											<>
												<div
													className="fixed inset-0 z-40"
													role="button"
													tabIndex={-1}
													aria-label="Close dropdown"
													onClick={() => setPmOpen(false)}
													onKeyDown={(e) => {
														if (e.key === "Escape") setPmOpen(false);
													}}
												/>
												<div className="absolute right-0 top-full mt-2 w-[160px] bg-white dark:bg-[#050505] border border-neutral-200 dark:border-white/[0.07] shadow-2xl shadow-black/10 dark:shadow-black/80 z-50 rounded-sm">
													{mcpCommands.map((mc, i) => (
														<button
															key={mc.name}
															onClick={() => copy(mc.command)}
															className={cn(
																"flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-all text-left",
																i < mcpCommands.length - 1 &&
																	"border-b border-neutral-100 dark:border-white/[0.06]",
															)}
														>
															<span className="font-mono text-[11px]">
																{mc.name}
															</span>
														</button>
													))}
												</div>
											</>
										)}
									</div>
								</div>
							) : (
								<div className="bg-neutral-100/50 dark:bg-[#050505] px-5 py-4">
									<p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-200 leading-relaxed">
										Set up WhatsApp integration in my project using Better Zap.
									</p>
									<div className="relative mt-1.5">
										<p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed line-clamp-2">
											Install better-zap. Create app/api/zap/[...all]/route.ts
											for webhooks. Initialize Zap SDK in lib/zap.ts, and send
											your first message...
										</p>
										<div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-neutral-100/50 dark:from-[#050505] to-transparent pointer-events-none" />
									</div>
									<div className="flex items-center justify-between mt-3 pt-2 border-t border-foreground/[0.04]">
										<button
											onClick={() => setPromptOpen(true)}
											className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												className="h-3 w-3"
											>
												<path
													fill="currentColor"
													d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5M12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3"
												/>
											</svg>
											View full prompt
										</button>
										<button
											onClick={() => copy(aiPromptText)}
											className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
										>
											{copied ? (
												<>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														className="h-3.5 w-3.5"
													>
														<path
															fill="currentColor"
															d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"
														/>
													</svg>
													Copied
												</>
											) : (
												<>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														className="h-3.5 w-3.5"
													>
														<path
															fill="currentColor"
															d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"
														/>
													</svg>
													Copy prompt
												</>
											)}
										</button>
									</div>
								</div>
							)}
						</div>
					</AnimatePresence>
				</div>
			</motion.div>

			{/* Prompt dialog */}
			<AnimatePresence>
				{promptOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 lg:left-[40%] z-50 flex items-center justify-center"
						onClick={() => setPromptOpen(false)}
					>
						{/* Backdrop - only covers right/content side */}
						<div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />

						{/* Dialog */}
						<motion.div
							initial={{ opacity: 0, y: 8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 8, scale: 0.98 }}
							transition={{ duration: 0.2, ease: "easeOut" }}
							onClick={(e) => e.stopPropagation()}
							className="relative w-[calc(100%-2rem)] max-w-lg mx-4 bg-neutral-50 dark:bg-[#0a0a0a] border border-neutral-200 dark:border-white/[0.06] rounded-sm shadow-2xl"
						>
							{/* Close */}
							<button
								onClick={() => setPromptOpen(false)}
								className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors z-10"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									className="h-4 w-4"
								>
									<path
										fill="currentColor"
										d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
									/>
								</svg>
							</button>

							{/* Content */}
							<div className="px-5 py-5 max-h-[60vh] overflow-y-auto">
								<p className="text-[12px] font-mono text-neutral-600 dark:text-neutral-400 leading-[1.9] whitespace-pre-line">
									{aiPromptText}
								</p>
							</div>

							{/* Footer */}
							<div className="flex justify-end px-5 py-3 border-t border-neutral-200 dark:border-white/[0.06]">
								<button
									onClick={() => copy(aiPromptText)}
									className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-sm border border-neutral-200 dark:border-white/[0.08] text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.04] transition-colors"
								>
									{copied ? (
										<>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												className="h-3.5 w-3.5"
											>
												<path
													fill="currentColor"
													d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"
												/>
											</svg>
											Copied
										</>
									) : (
										<>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												className="h-3.5 w-3.5"
											>
												<path
													fill="currentColor"
													d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"
												/>
											</svg>
											Copy prompt
										</>
									)}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

const EMPTY_CONTRIBUTORS: ContributorInfo[] = [];

function formatCount(num: number | null | undefined): string {
	if (num == null) return "—";
	if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
	if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
	return num.toString();
}

const footerLinks = [
	{ label: "Terms", href: "/legal/terms" },
	{ label: "Privacy", href: "/legal/privacy" },
	{ label: "Blog", href: "/blog" },
	{ label: "Community", href: "/community" },
	{ label: "Changelog", href: "/changelog" },
];

function ReadmeFooter({
	stats,
}: {
	stats: { npmDownloads: number; githubStars: number };
}) {
	return (
		<div className="relative mt-10 pt-8 pb-0 overflow-hidden">
			{/* Watermark logo */}
			<div
				className="absolute -right-10 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.03] dark:opacity-[0.04]"
				aria-hidden="true"
			>
				<svg
					width="300"
					height="225"
					viewBox="0 0 60 45"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						d="M0 0H15V15H30V30H15V45H0V30V15V0ZM45 30V15H30V0H45H60V15V30V45H45H30V30H45Z"
						className="fill-foreground"
					/>
				</svg>
			</div>

			{/* Dot grid */}
			<div
				className="absolute inset-0 pointer-events-none select-none"
				aria-hidden="true"
				style={{
					backgroundImage:
						"radial-gradient(circle, currentColor 0.5px, transparent 0.5px)",
					backgroundSize: "24px 24px",
					opacity: 0.03,
				}}
			/>

			{/* CTA */}
			<div className="relative">
				<p className="text-center text-[15px] text-foreground/60 dark:text-foreground/50 tracking-tight">
					Integrate WhatsApp into your app in minutes.
				</p>

				<div className="flex items-center justify-center gap-4 mt-4">
					<a
						href="https://dash.better-zap.com/sign-in"
						className="inline-flex items-center gap-1.5 px-5 py-2 bg-foreground text-background text-[11px] font-mono uppercase tracking-wider hover:opacity-90 transition-opacity"
					>
						Get Started
					</a>
					<Link
						href="/docs"
						className="inline-flex items-center gap-1.5 px-4 py-2 border border-foreground/12 text-foreground/50 dark:text-foreground/40 hover:text-foreground/70 hover:border-foreground/25 text-[11px] font-mono uppercase tracking-wider transition-all"
					>
						Read Docs
					</Link>
				</div>
			</div>

			{/* Footer */}
			<div className="relative mt-10 pt-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
						{footerLinks.map((link, i) => (
							<span key={link.label} className="flex items-center">
								<Link
									href={link.href}
									className="group inline-flex items-center gap-1 text-[11px] font-mono text-foreground/50 hover:text-foreground/80 transition-colors"
								>
									{link.label}
								</Link>
								{i < footerLinks.length - 1 && (
									<span className="text-foreground/10 mx-1 text-[10px] select-none">
										/
									</span>
								)}
							</span>
						))}
					</div>

					<div className="flex items-center justify-between w-full sm:w-auto sm:gap-4 shrink-0">
						<span className="text-[10px] text-foreground/50 font-mono">
							© {new Date().getFullYear()} Better Zap Inc.
						</span>
						<div className="flex items-center gap-3 sm:gap-4">
							<span className="text-foreground/10 select-none hidden sm:inline">
								·
							</span>
							<Link
								href="https://github.com/better-zap"
								aria-label="GitHub"
								className="text-foreground/50 hover:text-foreground/80 transition-colors"
							>
								<Github className="h-4 w-4" />
							</Link>
							<div className="h-4 w-4 flex text-foreground/15 items-center justify-center select-none">
								|
							</div>
							<div className="-ml-4 sm:-ml-5">
								<ThemeToggle />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function HeroReadMe({
	contributors,
	stats,
}: {
	contributors: ContributorInfo[];
	stats: { npmDownloads: number; githubStars: number };
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
			className="flex flex-col w-full"
		>
			{/* Markdown content */}
			<div className="flex-1 overflow-y-auto no-scrollbar">
				<div className="p-5 lg:p-5 pt-8 lg:pt-16">
					<motion.article
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.4, delay: 0.3 }}
						className="overflow-y-auto overflow-x-hidden no-scrollbar pt-[30px] pb-0"
					>
						<h1 className="flex items-center gap-2 text-sm sm:text-[15px] font-mono text-neutral-900 dark:text-neutral-100 pb-2 sm:pb-3 mb-4 sm:mb-5 border-b border-foreground/15">
							README
						</h1>

						<p className="text-sm sm:text-[14px] text-neutral-600 dark:text-neutral-300 leading-[1.8] sm:leading-[1.9] mb-5 sm:mb-6">
							Better Zap is a WhatsApp integration framework for Next.js. It
							provides a catch-all route for webhooks and a type-safe SDK to
							send messages, manage media, and handle complex WhatsApp Business
							API flows with ease.
						</p>

						<InstallBlock />

						<div className="flex items-center gap-3 my-4">
							<div className="flex-1 border-t border-foreground/6"></div>
							<span className="text-[10px] text-foreground/50 dark:text-foreground/50 font-mono tracking-wider uppercase shrink-0">
								Trusted By
							</span>
						</div>

						<TrustedBy />

						<div className="flex items-center gap-3 my-4">
							<span className="text-[10px] text-foreground/50 dark:text-foreground/50 font-mono tracking-wider uppercase shrink-0">
								Features
							</span>
							<div className="flex-1 border-t border-foreground/10"></div>
						</div>

						<div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-2 border border-foreground/15 overflow-hidden">
							{[
								{
									label: "Next.js Native",
									headline: "Plug and play.",
									desc: "First-class support for Next.js App Router with a single catch-all route for all webhooks.",
									logos: true,
									href: "/docs",
								},
								{
									label: "Webhook Receiver",
									headline: "Zero-config handler.",
									desc: "Automatically handle incoming messages, status updates, and media receipts with built-in validation.",
									href: "/docs",
								},
								{
									label: "Message SDK",
									headline: "Type-safe sending.",
									desc: "Send text, images, videos, and interactive buttons using a simple, unified API.",
									href: "/docs",
								},
								{
									label: "Session Sync",
									headline: "Scale your reach.",
									desc: "Manage multiple WhatsApp numbers and business sessions with unified state management.",
									org: true,
									href: "/docs",
								},
								{
									label: "Template Manager",
									headline: "Business ready.",
									desc: "Full support for WhatsApp Message Templates with variables and interactive components.",
									enterprise: true,
									href: "/docs",
								},
								{
									label: "Unified SDK",
									headline: "Full control.",
									desc: "Comprehensive TypeScript SDK for media management, profile updates, and real-time event routing.",
									plugins: true,
									href: "/docs",
								},
								{
									label: "Real-time Events",
									headline: "Stay in sync.",
									desc: "Subscribe to message status, delivery receipts, and user interactions as they happen.",
									href: "/docs",
								},
								{
									label: "Infrastructure",
									headline: "High performance.",
									desc: "Built for high-volume messaging with automatic retries and rate limit management.",
									security: true,
									href: "/docs",
									managed: true,
								},
								{
									label: "Zap Dashboard",
									headline: "Monitor everything.",
									desc: "Visualize message flow, status, and health of your WhatsApp integration in real-time.",
									dashboard: true,
									href: "/docs",
									managed: true,
								},
							].map((feature, i) => (
								<Link
									key={feature.label}
									href={"href" in feature ? feature.href : "#"}
									className="contents"
								>
									<motion.div
										whileHover={{
											y: -2,
											transition: { duration: 0.2, ease: "easeOut" },
										}}
										className={cn(
											"group/card relative p-4 lg:p-5 border-foreground/[0.15] min-h-[180px] transition-all duration-200 hover:bg-foreground/[0.02] hover:shadow-[inset_0_1px_0_0_rgba(128,128,128,0.1)] hover:z-10",
											i < 8 && "border-b",
											i >= 6 && "md:border-b-0",
											i % 2 === 0 && i < 8 && "sm:border-r",
											i % 3 === 2 && "md:border-r-0",
											i % 2 !== 0 && i % 3 !== 2 && "md:border-r",
										)}
									>
										<span className="absolute top-3 right-3 lg:top-4 lg:right-4 opacity-0 -translate-y-0.5 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-200">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="text-foreground/40 dark:text-foreground/50"
											>
												<line x1="7" y1="17" x2="17" y2="7" />
												<polyline points="7 7 17 7 17 17" />
											</svg>
										</span>
										<div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider transition-colors duration-200 group-hover/card:text-neutral-400 dark:group-hover/card:text-neutral-300">
											<span className="text-foreground/45 dark:text-foreground/30 mr-1.5 transition-colors duration-200 group-hover/card:text-foreground/60 dark:group-hover/card:text-foreground/40">
												{String(i + 1).padStart(2, "0")}
											</span>
											{feature.label}
											{"managed" in feature && feature.managed && (
												<span className="ml-1.5 text-[8px] normal-case tracking-widest text-foreground/40 dark:text-foreground/30 border border-dashed border-foreground/10 px-1 py-px">
													managed
												</span>
											)}
										</div>
										<div className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug mb-1.5 transition-colors duration-200 group-hover/card:text-neutral-950 dark:group-hover/card:text-white">
											{feature.headline}
										</div>
										<div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed transition-colors duration-200 group-hover/card:text-neutral-400 dark:group-hover/card:text-neutral-300">
											{feature.desc}
										</div>
										{"logos" in feature && feature.logos && (
											<div className="flex items-center gap-3.5 mt-3">
												{/* Next.js */}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="15"
													height="15"
													viewBox="0 0 24 24"
													className="text-neutral-800 dark:text-neutral-200 opacity-60 transition-all duration-300 group-hover/card:opacity-100 group-hover/card:animate-[icon-bounce_0.4s_ease-out_0s]"
												>
													<path
														fill="currentColor"
														d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m4-14h-1.35v4H16zM9.346 9.71l6.059 7.828l1.054-.809L9.683 8H8v7.997h1.346z"
													/>
												</svg>
											</div>
										)}
										{"org" in feature && feature.org && (
											<div className="mt-3 flex items-center gap-2.5">
												<div className="flex -space-x-1.5">
													<div className="relative size-5 rounded-full border border-foreground/[0.08] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center z-[3]">
														<span className="text-[8px] font-mono text-foreground/55 dark:text-foreground/35 leading-none">
															A
														</span>
													</div>
													<div className="relative size-5 rounded-full border border-foreground/[0.08] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center z-[2]">
														<span className="text-[8px] font-mono text-foreground/50 dark:text-foreground/30 leading-none">
															B
														</span>
													</div>
													<div className="relative size-5 rounded-full border border-foreground/[0.08] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center z-[1]">
														<span className="text-[8px] font-mono text-foreground/40 dark:text-foreground/50 leading-none">
															C
														</span>
													</div>
													<div className="relative size-5 rounded-full border border-dashed border-foreground/[0.1] bg-background flex items-center justify-center z-[0]">
														<span className="text-[8px] font-mono text-foreground/35 dark:text-foreground/20 leading-none">
															+
														</span>
													</div>
												</div>
											</div>
										)}
										{"plugins" in feature && feature.plugins && (
											<div className="mt-3 relative overflow-hidden">
												<div className="flex items-center gap-1 overflow-hidden">
													{[
														"media",
														"profile",
														"templates",
														"webhooks",
														"buttons",
														"lists",
														"contacts",
														"interactive",
													].map((plugin, i) => (
														<span
															key={plugin}
															className={`text-[8px] font-mono whitespace-nowrap px-1.5 py-0.5 border shrink-0 ${i < 2 ? "text-foreground/50 dark:text-foreground/30 border-foreground/[0.08] bg-foreground/[0.02]" : i < 4 ? "text-foreground/40 dark:text-foreground/22 border-foreground/[0.06] bg-foreground/[0.015]" : "text-foreground/30  border-foreground/[0.05]"}`}
														>
															{plugin}
														</span>
													))}
												</div>
												<div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
											</div>
										)}
									</motion.div>
								</Link>
							))}
						</div>

						<ReadmeFooter stats={stats} />
					</motion.article>
				</div>
			</div>
		</motion.div>
	);
}
