import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, Calculator } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function DashboardHeader() {
  const router = useRouter();

  const handleCalculateBestCard = () => {
    router.push('/pay');
  };

  return (
    <div className="mb-12">
      <h1 className="text-4xl sm:text-5xl font-bold text-[#E8D8B0] mb-4">
        Welcome to <span className="text-[#C5AA67]">Omni-Wallet</span>
      </h1>
      <p className="text-xl text-[#8B8070] mb-6">
        AI-powered portfolio management with Fivetran data synchronization
      </p>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleCalculateBestCard} className="bg-[#C5AA67] hover:bg-[#A8893F] text-[#0D0A06] border-0">
          <Calculator className="w-4 h-4 mr-2" />
          Calculate Best Card
        </Button>
        <Link href="/pay">
          <Button variant="outline" className="border-[#C5AA67]/40 text-[#C5AA67] hover:bg-[#C5AA67]/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Test Interchange
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" className="border-[#C5AA67]/40 text-[#C5AA67] hover:bg-[#C5AA67]/10">
            <DollarSign className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </Link>
      </div>
    </div>
  );
}
