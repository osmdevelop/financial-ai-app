import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { Link } from "wouter";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getSeverityBadgeVariant(severity: string): "destructive" | "secondary" | "outline" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "outline";
  }
}

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead, removeNotification, clearAll, unreadCount } =
    useNotifications();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="notifications-page">
      <Header
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  All Notifications
                </CardTitle>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      data-testid="button-mark-all-read"
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Mark All Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="text-destructive hover:text-destructive"
                      data-testid="button-clear-notifications"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <EmptyStateCard
                  icon={<BellOff className="h-10 w-10 text-muted-foreground" />}
                  title="No notifications"
                  description="You'll see alerts here when market conditions change based on your alert settings."
                  actionLabel="Configure Alerts"
                  onAction={() => window.location.href = "/alerts"}
                />
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notification={notif}
                        onMarkRead={() => markAsRead(notif.id)}
                        onRemove={() => removeNotification(notif.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

interface NotificationRowProps {
  notification: AppNotification;
  onMarkRead: () => void;
  onRemove: () => void;
}

function NotificationRow({ notification, onMarkRead, onRemove }: NotificationRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between p-4 rounded-lg border transition-colors",
        notification.read
          ? "bg-card"
          : "bg-primary/5 border-primary/20"
      )}
      data-testid={`notif-item-${notification.id}`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="mt-0.5">{getSeverityIcon(notification.severity)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-medium", !notification.read && "text-primary")}>
              {notification.title}
            </span>
            <Badge variant={getSeverityBadgeVariant(notification.severity)} className="text-xs">
              {notification.severity}
            </Badge>
            {!notification.read && (
              <Badge variant="default" className="text-xs">
                New
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            {notification.link && (
              <Link href={notification.link}>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  View Details
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMarkRead}
            className="h-8 w-8"
            title="Mark as read"
            data-testid={`button-mark-read-${notification.id}`}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Remove"
          data-testid={`button-remove-${notification.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
