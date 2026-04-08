"use client";

import { WhatsApp } from "@/assets/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Search,
  MessageSquare,
  ArrowLeft,
  Paperclip,
  Smile,
  Mic,
  Send,
  CheckCheck,
  CircleDashed,
  Users,
  Plus,
  Github,
  ExternalLink,
  Menu,
  Info,
  BookOpen,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import WppBg from "@/assets/wpp-bg.webp";

import type { CommunityStats } from "@/lib/community-stats";

type Message = {
  id: string;
  text: string | React.ReactNode;
  sender: "me" | "other";
  time: string;
  status?: "sent" | "delivered" | "read";
};

type Chat = {
  id: string;
  name: string;
  avatar: React.ReactNode;
  status: string;
  messages: Message[];
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
};

export function WhatsAppLanding({ stats }: { stats: CommunityStats }) {
  const CHATS: Chat[] = [
    {
      id: "home",
      name: "Better Zap (Oficial)",
      avatar: <WhatsApp className="w-10 h-10" />,
      status: "online",
      lastTime: "10:00",
      unread: 0,
      messages: [
        {
          id: "1",
          text: "Oi! Bem-vindo ao Better Zap. 👋",
          sender: "other",
          time: "10:00",
          status: "read",
        },
        {
          id: "2",
          text: "Não somos apenas mais um provedor da Meta. Aqui você é o dono da sua infraestrutura e dos seus dados.",
          sender: "other",
          time: "10:01",
          status: "read",
        },
        {
          id: "3",
          text: (
            <div className="space-y-3">
              <p>Diferente de outros serviços, com Better Zap você:</p>
              <ul className="list-disc list-inside space-y-1 opacity-90">
                <li>Usa sua própria Business Account</li>
                <li>Usa sua infraestrutura</li>
                <li>É dono dos seus dados</li>
              </ul>
            </div>
          ),
          sender: "other",
          time: "10:01",
          status: "read",
        },
        {
          id: "4",
          text: (
            <div className="flex flex-col gap-2">
              <p>Pronto para começar?</p>
              <Link
                href="/docs/installation"
                className="bg-[#25D366] text-black px-4 py-2 rounded-md font-bold text-center hover:bg-[#20bd5b] transition-colors"
              >
                Guia de Instalação
              </Link>
            </div>
          ),
          sender: "other",
          time: "10:02",
          status: "read",
        },
      ],
    },
    {
      id: "stats",
      name: "Comunidade / Status",
      avatar: (
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
          <Users size={20} />
        </div>
      ),
      status: "online",
      lastTime: "12:45",
      messages: [
        {
          id: "s1",
          text: "Como está o crescimento do Better Zap?",
          sender: "me",
          time: "12:44",
          status: "read",
        },
        {
          id: "s2",
          text: (
            <div className="space-y-3">
              <p>Estamos crescendo rápido! Olha nossos números atuais:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-black/20 p-2 rounded text-center">
                  <div className="text-[#25D366] font-bold">
                    {stats.githubStars.toLocaleString()}+
                  </div>
                  <div className="text-[10px] text-[#8696a0]">STARS</div>
                </div>
                <div className="bg-black/20 p-2 rounded text-center">
                  <div className="text-[#25D366] font-bold">
                    {stats.npmDownloads.toLocaleString()}+
                  </div>
                  <div className="text-[10px] text-[#8696a0]">DOWNLOADS</div>
                </div>
                <div className="bg-black/20 p-2 rounded text-center">
                  <div className="text-[#25D366] font-bold">
                    {stats.contributors}+
                  </div>
                  <div className="text-[10px] text-[#8696a0]">CONTRIBUTORS</div>
                </div>
                <div className="bg-black/20 p-2 rounded text-center">
                  <div className="text-[#25D366] font-bold">
                    {stats.discordMembers.toLocaleString()}+
                  </div>
                  <div className="text-[10px] text-[#8696a0]">MEMBERS</div>
                </div>
              </div>
            </div>
          ),
          sender: "other",
          time: "12:45",
          status: "read",
        },
      ],
    },
    {
      id: "docs",
      name: "Documentação",
      avatar: (
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
          <BookOpen size={20} />
        </div>
      ),
      status: "online",
      lastTime: "Yesterday",
      messages: [
        {
          id: "d1",
          text: "Como eu começo a usar o Better Zap?",
          sender: "me",
          time: "14:20",
          status: "read",
        },
        {
          id: "d2",
          text: "É super simples! Primeiro instale o pacote:",
          sender: "other",
          time: "14:21",
          status: "read",
        },
        {
          id: "d3",
          text: (
            <div className="bg-black/10 dark:bg-black/40 p-3 rounded font-mono text-sm border border-black/5">
              pnpm add better-zap
            </div>
          ),
          sender: "other",
          time: "14:21",
          status: "read",
        },
        {
          id: "d4",
          text: "Depois é só configurar seu adapter preferido (PostgreSQL, MySQL, SQLite, etc) e pronto!",
          sender: "other",
          time: "14:22",
          status: "read",
        },
      ],
    },
    {
      id: "about",
      name: "Sobre o Projeto",
      avatar: (
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white">
          <Info size={20} />
        </div>
      ),
      status: "visto por último hoje às 09:30",
      lastTime: "09:30",
      messages: [
        {
          id: "a1",
          text: "O Better Zap foi criado para dar liberdade aos desenvolvedores.",
          sender: "other",
          time: "09:30",
          status: "read",
        },
        {
          id: "a2",
          text: "Inspirado no Better Auth, buscamos trazer o mesmo nível de excelência e DX (Developer Experience) para o mundo do WhatsApp.",
          sender: "other",
          time: "09:31",
          status: "read",
        },
      ],
    },
    {
      id: "github",
      name: "GitHub / Comunidade",
      avatar: (
        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-white">
          <Github size={20} />
        </div>
      ),
      status: "online",
      lastTime: "08:15",
      messages: [
        {
          id: "g1",
          text: "O projeto é open source?",
          sender: "me",
          time: "08:14",
          status: "read",
        },
        {
          id: "g2",
          text: "Sim! Somos 100% open source. Você pode contribuir, reportar bugs ou sugerir features no nosso repositório.",
          sender: "other",
          time: "08:15",
          status: "read",
        },
        {
          id: "g3",
          text: (
            <a
              href="https://github.com/better-zap/better-zap"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-neutral-800 text-white px-4 py-2 rounded-md font-medium hover:bg-neutral-700 transition-colors"
            >
              <Github size={18} />
              Ver no GitHub
            </a>
          ),
          sender: "other",
          time: "08:16",
          status: "read",
        },
      ],
    },
  ];
  const [activeChatId, setActiveChatId] = useState("home");
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = CHATS.find((c) => c.id === activeChatId) || CHATS[0];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChatId]);

  const handleChatSelect = (id: string) => {
    setActiveChatId(id);
    setIsMobileListOpen(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#111b21] overflow-hidden">
      {/* WhatsApp Web Container */}
      <div className="w-full h-full flex shadow-2xl overflow-hidden">
        {/* Sidebar (Chat List) */}
        <div
          className={cn(
            "w-full md:w-[400px] h-full flex flex-col border-r border-[#202c33] bg-[#111b21]",
            !isMobileListOpen && "hidden md:flex",
          )}
        >
          {/* Sidebar Header */}
          <div className="h-[60px] flex items-center justify-between px-4 bg-[#202c33]">
            <div className="w-10 h-10 rounded-full bg-[#374248] flex items-center justify-center overflow-hidden">
              <Zap className="text-[#25D366] w-6 h-6" />
            </div>
            <div className="flex gap-4 text-[#aebac1]">
              <CircleDashed className="w-6 h-6 cursor-pointer" />
              <MessageSquare className="w-6 h-6 cursor-pointer" />
              <MoreVertical className="w-6 h-6 cursor-pointer" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2 border-b border-[#202c33]">
            <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-[#aebac1] mr-3" />
              <input
                type="text"
                placeholder="Pesquisar ou começar uma nova conversa"
                className="bg-transparent border-none outline-none text-[#d1d7db] text-sm w-full placeholder:text-[#8696a0]"
              />
            </div>
          </div>

          {/* Chat List Items */}
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {CHATS.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={cn(
                    "flex items-center px-3 h-[72px] cursor-pointer hover:bg-[#202c33] transition-colors",
                    activeChatId === chat.id && "bg-[#2a3942]",
                  )}
                >
                  <div className="mr-3">{chat.avatar}</div>
                  <div className="flex-1 flex flex-col justify-center border-b border-[#202c33] h-full py-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#e9edef] font-medium">
                        {chat.name}
                      </span>
                      <span className="text-[#8696a0] text-xs">
                        {chat.lastTime}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#8696a0] text-sm truncate w-[240px]">
                        {chat.messages[chat.messages.length - 1].sender ===
                          "me" && "✓ "}
                        {chat.id === "home"
                          ? "Oi! Bem-vindo ao Better Zap..."
                          : "Clique para ver mais..."}
                      </span>
                      {chat.unread ? (
                        <span className="bg-[#25D366] text-[#0b141a] text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {chat.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div
          className={cn(
            "flex-1 h-full flex flex-col bg-[#0b141a] relative",
            isMobileListOpen && "hidden md:flex",
          )}
        >
          {/* Chat Background Image */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
            style={{
              backgroundImage: `url(${WppBg.src})`,
              backgroundRepeat: "repeat",
              backgroundSize: "400px",
            }}
          />

          {/* Chat Header */}
          <div className="h-[60px] flex items-center justify-between px-4 bg-[#202c33] z-10">
            <div className="flex items-center">
              <div
                className="md:hidden mr-2 text-[#aebac1] cursor-pointer"
                onClick={() => setIsMobileListOpen(true)}
              >
                <ArrowLeft className="w-6 h-6" />
              </div>
              <div className="mr-3">{activeChat.avatar}</div>
              <div className="flex flex-col">
                <span className="text-[#e9edef] text-sm md:text-base font-medium leading-tight">
                  {activeChat.name}
                </span>
                <span className="text-[#8696a0] text-[12px]">
                  {activeChat.status}
                </span>
              </div>
            </div>
            <div className="flex gap-4 text-[#aebac1]">
              <Search className="w-5 h-5 cursor-pointer hidden md:block" />
              <MoreVertical className="w-5 h-5 cursor-pointer" />
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4 md:px-8 z-10">
            <motion.div
              key={activeChatId}
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.6,
                    delayChildren: 0.3,
                  },
                },
              }}
              className="flex flex-col gap-2 max-w-[1000px] mx-auto min-h-full"
            >
              {activeChat.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.85, y: 15 },
                    visible: { opacity: 1, scale: 1, y: 0 },
                  }}
                  transition={{
                    type: "spring",
                    damping: 30,
                    stiffness: 200,
                  }}
                  className={cn(
                    "max-w-[85%] md:max-w-[65%] rounded-lg px-2 py-1.5 shadow-sm relative group",
                    msg.sender === "me"
                      ? "self-end bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                      : "self-start bg-[#202c33] text-[#e9edef] rounded-tl-none",
                  )}
                >
                  {/* Bubble Triangle */}
                  <div
                    className={cn(
                      "absolute top-0 w-2 h-2",
                      msg.sender === "me"
                        ? "right-[-8px] border-l-[8px] border-l-[#005c4b] border-b-[8px] border-b-transparent"
                        : "left-[-8px] border-r-[8px] border-r-[#202c33] border-b-[8px] border-b-transparent",
                    )}
                  />

                  <div className="px-1 py-0.5">
                    <div className="text-sm md:text-[15px] leading-relaxed break-words">
                      {msg.text}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-[#8696a0] uppercase">
                        {msg.time}
                      </span>
                      {msg.sender === "me" && (
                        <CheckCheck
                          className={cn(
                            "w-3 h-3",
                            msg.status === "read"
                              ? "text-[#53bdeb]"
                              : "text-[#8696a0]",
                          )}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
