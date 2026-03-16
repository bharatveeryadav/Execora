import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_TITLES: Record<string, string> = {
  "credit-notes": "Credit Notes",
  "purchase-orders": "Purchase Order",
  "debit-orders": "Debit Order",
  "delivery-challans": "Delivery Challans",
  "packaging-lists": "Packaging Lists",
  "indirect-income": "Indirect Income",
  journals: "Journals",
  "online-store": "Online Store",
  addons: "Add-ons",
  mydrive: "MyDrive",
  tutorial: "Tutorial",
  feedback: "Feedback",
};

const ComingSoon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegment = location.pathname.replace(/^\//, "").split("/")[0] ?? "";
  const title = PAGE_TITLES[pathSegment] ?? "This feature";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Construction className="mx-auto h-16 w-16 text-muted-foreground/60 mb-4" />
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6">Coming soon</p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
