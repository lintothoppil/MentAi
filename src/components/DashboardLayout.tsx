import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu, LogOut, Bell, Search, ChevronRight, LayoutDashboard,
    Calendar, CheckCheck, Info, AlertTriangle, BookOpen, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    icon: React.ReactNode;
    path: string;
    isActive?: boolean;
}

interface DashboardLayoutProps {
    children: React.ReactNode;
    role: string;
    roleLabel: string;
    navItems: NavItem[];
    gradientClass: string;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string | null;
}

// Icon per notification type
const NotifIcon = ({ type }: { type: string }) => {
    if (type === "session")  return <Calendar className="h-4 w-4 text-blue-500 shrink-0" />;
    if (type === "warning")  return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
    if (type === "academic") return <BookOpen className="h-4 w-4 text-mentor shrink-0" />;
    return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
};

const timeAgo = (iso: string | null) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

// ── Notification Bell ────────────────────────────────────────────────────────
const NotificationBell = ({ admNo }: { admNo: string }) => {
    const [open, setOpen]           = useState(false);
    const [notifs, setNotifs]       = useState<Notification[]>([]);
    const [unread, setUnread]       = useState(0);
    const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchNotifs = async () => {
        if (!admNo) return;
        try {
            const res = await fetch(`http://localhost:5000/api/student/notifications/${admNo}`);
            const d = await res.json();
            if (d.success) {
                setNotifs(d.data);
                setUnread(d.unread_count || 0);
            }
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchNotifs();
        intervalRef.current = setInterval(fetchNotifs, 60_000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [admNo]);

    const markRead = async (id: number) => {
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
        await fetch(`http://localhost:5000/api/student/notifications/${id}/read`, { method: "PATCH" });
    };

    const markAllRead = async () => {
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
        await fetch(`http://localhost:5000/api/student/notifications/${admNo}/read-all`, { method: "PATCH" });
    };

    const handleOpen = (isOpen: boolean) => {
        setOpen(isOpen);
        // Auto-mark all read when panel is opened
        if (isOpen && unread > 0) markAllRead();
    };

    return (
        <div className="relative">
            <button
                onClick={() => handleOpen(!open)}
                className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <AnimatePresence>
                    {unread > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center border-2 border-card"
                        >
                            {unread > 9 ? "9+" : unread}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-primary" />
                                    <span className="font-semibold text-sm">Notifications</span>
                                    {unread > 0 && (
                                        <Badge className="bg-destructive text-white text-[10px] h-4 px-1.5">{unread}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {notifs.some(n => !n.is_read) && (
                                        <button
                                            onClick={markAllRead}
                                            className="text-[11px] text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
                                        >
                                            <CheckCheck className="h-3 w-3" /> Mark all read
                                        </button>
                                    )}
                                    <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors">
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <ScrollArea className="max-h-[420px]">
                                {notifs.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center text-muted-foreground">
                                        <Bell className="h-10 w-10 opacity-20 mb-2" />
                                        <p className="text-sm">No notifications yet</p>
                                    </div>
                                ) : (
                                    <div>
                                        {notifs.map((n, i) => (
                                            <motion.button
                                                key={n.id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => markRead(n.id)}
                                                className={cn(
                                                    "w-full text-left px-4 py-3 flex gap-3 border-b border-border/50 transition-colors hover:bg-muted/40",
                                                    !n.is_read && "bg-primary/5 border-l-2 border-l-primary"
                                                )}
                                            >
                                                <div className="mt-0.5">
                                                    <NotifIcon type={n.type} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={cn("text-sm leading-tight", !n.is_read && "font-semibold")}>
                                                            {n.title}
                                                        </p>
                                                        {!n.is_read && (
                                                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                                        {n.message}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                        {timeAgo(n.created_at)}
                                                    </p>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Main Layout ──────────────────────────────────────────────────────────────
const DashboardLayout = ({
    children, role, roleLabel, navItems, gradientClass
}: DashboardLayoutProps) => {
    const navigate = useNavigate();

    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}"); }
        catch { return {}; }
    });

    useEffect(() => {
        if (!localStorage.getItem("user")) navigate("/login");
        // Re-read user when StudentDashboard patches localStorage with correct name
        const handleStorage = () => {
            try {
                const u = JSON.parse(localStorage.getItem("user") || "{}");
                setUser(u);
            } catch { /* ignore */ }
        };
        window.addEventListener("storage", handleStorage);
        // Also poll once after 2s so same-tab patches (from StudentDashboard) are caught
        const t = setTimeout(handleStorage, 2000);
        return () => { window.removeEventListener("storage", handleStorage); clearTimeout(t); };
    }, [navigate]);

    if (!user || !localStorage.getItem("user")) return null;

    const photoUrl = user.photo_path
        ? `http://localhost:5000/static/${user.photo_path}`
        : "/placeholder-avatar.jpg";

    const isStudent = role === "student";
    const admNo = user.admission_number || "";

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6">
                <Logo size="md" />
                <div className={cn(
                    "mt-4 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-accent/10 text-accent mx-1",
                )}>
                    {roleLabel}
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item, index) => (
                    <Link
                        key={index}
                        to={item.path}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                            "hover:bg-accent/10 hover:text-accent",
                            item.isActive ? "bg-accent/10 text-accent shadow-sm" : "text-muted-foreground"
                        )}
                    >
                        <span className={cn(
                            "p-1 rounded-md transition-colors",
                            item.isActive ? "bg-accent text-white" : "text-muted-foreground group-hover:text-accent"
                        )}>
                            {item.icon}
                        </span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-border mt-auto">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-muted/30 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 border-r border-border bg-card fixed h-full z-30">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
                        <Menu className="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <SidebarContent />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
                {/* Header */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20 px-6 flex items-center justify-between">
                    <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="font-medium text-foreground capitalize">{role}</span>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search"
                                name="search"
                                placeholder="Search..."
                                className="w-64 pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
                            />
                        </div>

                        {/* Bell — live notifications for students, static for others */}
                        {isStudent && admNo ? (
                            <NotificationBell admNo={admNo} />
                        ) : (
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        )}

                        {/* Avatar + Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarImage src={photoUrl} alt="User" className="object-cover" />
                                        <AvatarFallback className={cn("text-white", gradientClass)}>
                                            {user.name ? user.name.substring(0, 2).toUpperCase() : role.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.name || "User Name"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.admission_number || user.email || "user@example.com"}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/dashboard/${role}/profile`)}>
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-6 lg:p-10 animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
