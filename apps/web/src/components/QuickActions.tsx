import { useState } from 'react';
import { FileText, Wallet, Package, ShoppingCart, Users, BarChart3, Truck, Zap, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InvoiceCreation from '@/components/InvoiceCreation';

const QuickActions = () => {
	const [invoiceOpen, setInvoiceOpen] = useState(false);
	const [walkInOpen, setWalkInOpen] = useState(false);
	const navigate = useNavigate();

	const actions = [
		{ label: 'Quick Sale ▶', icon: Zap, primary: true, onClick: () => setWalkInOpen(true) },
		{ label: 'New Invoice', icon: FileText, primary: false, onClick: () => setInvoiceOpen(true) },
		{ label: 'Classic Bill', icon: ClipboardList, primary: false, onClick: () => navigate('/billing') },
		{ label: 'Payment In', icon: Wallet, primary: false, onClick: () => navigate('/payment') },
		{ label: 'Stock Check', icon: Package, primary: false, onClick: () => navigate('/inventory') },
		{ label: 'Invoices', icon: FileText, primary: false, onClick: () => navigate('/invoices') },
		{ label: 'Customers', icon: Users, primary: false, onClick: () => navigate('/customers') },
		{ label: 'Expenses', icon: ShoppingCart, primary: false, onClick: () => navigate('/expenses') },
		{ label: 'Purchases', icon: Truck, primary: false, onClick: () => navigate('/purchases') },
		{ label: 'Reports', icon: BarChart3, primary: false, onClick: () => navigate('/reports') },
	];

	return (
		<div>
			<div className="grid grid-cols-4 gap-2.5">
				{actions.map((action) => (
					<button
						key={action.label}
						onClick={action.onClick}
						className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-center transition-all active:scale-95 ${
							action.primary
								? 'border-primary bg-primary text-primary-foreground shadow-md'
								: 'border-border bg-card text-foreground hover:bg-muted/60'
						}`}
					>
						<action.icon
							className={`h-5 w-5 ${action.primary ? 'text-primary-foreground' : 'text-muted-foreground'}`}
						/>
						<span className="text-[11px] font-semibold leading-tight">{action.label}</span>
					</button>
				))}
			</div>

			<InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
			<InvoiceCreation open={walkInOpen} onOpenChange={setWalkInOpen} startAsWalkIn />
		</div>
	);
};

export default QuickActions;
