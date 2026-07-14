import { AppShell } from "@/components/app-shell";
import { NotificationsList } from "@/components/notifications-list";
import { PageHeading } from "@cattower/ui";

export default function NotificationsPage() { return <AppShell narrow><PageHeading eyebrow="Web内通知" title="お知らせ" description="必要なことだけ、静かにまとめます。" /><NotificationsList /></AppShell>; }
