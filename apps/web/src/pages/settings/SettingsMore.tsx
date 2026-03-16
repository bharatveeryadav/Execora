/**
 * More — links to add-ons, backup, support
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, FolderOpen, HelpCircle, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsMore() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4" />
            More
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Add-ons, storage, and support.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/addons")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add-ons
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/mydrive")}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            MyDrive
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/tutorial")}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Tutorial
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/feedback")}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
