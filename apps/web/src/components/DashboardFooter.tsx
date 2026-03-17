import { APP_NAME } from "@/lib/app-config";

const DashboardFooter = () => {
  return (
    <footer className="border-t py-4 text-center text-xs text-muted-foreground">
      © 2026 {APP_NAME} SME · Made with ❤️ in India · Support: help@execora.com
    </footer>
  );
};

export default DashboardFooter;
