import { Button, Card, CardContent } from "@aypros/ui";
import Link from "next/link";
import { PiRocketLaunch } from "react-icons/pi";

export function WelcomeHero({ organizationName }: { organizationName: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Bem-vindo à {organizationName}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Comece descobrindo empresas por cidade e segmento. O Aypros analisa a presença digital
            de cada uma e aponta as melhores oportunidades de venda.
          </p>
        </div>
        <Button asChild>
          <Link href="/discovery">
            <PiRocketLaunch aria-hidden />
            Fazer primeira pesquisa
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
