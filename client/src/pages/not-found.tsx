import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, FileText } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto w-full">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Page not found</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    The page you're looking for doesn't exist or was moved.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Get back to your daily market playbook — when markets move, know exactly why.
              </p>
              <Button asChild className="w-full">
                <Link href="/">
                  <FileText className="h-4 w-4 mr-2" />
                  Open Daily Brief
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
