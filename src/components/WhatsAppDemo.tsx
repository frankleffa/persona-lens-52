
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { Send, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function WhatsAppDemo() {
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("Olá! Teste de integração AdScape.");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!phone) {
            toast.error("Por favor digite um número de WhatsApp.");
            return;
        }
        if (!message) {
            toast.error("Por favor digite uma mensagem.");
            return;
        }

        setLoading(true);
        try {
            const result = await sendWhatsAppMessage(phone, message);
            if (result.success) {
                toast.success("Mensagem enviada com sucesso!");
                setMessage("");
            } else {
                toast.error(`Erro: ${result.error}`);
            }
        } catch (error) {
            toast.error("Erro ao enviar mensagem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center p-8 bg-background min-h-screen">
            <Card className="w-full max-w-md h-fit">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-green-600" />
                        WhatsApp Sender (Evolution API)
                    </CardTitle>
                    <CardDescription>
                        Envie mensagens através da sua integração Evolution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Configuração Necessária</AlertTitle>
                        <AlertDescription className="text-xs">
                            Certifique-se de ter configurado as variáveis <code>EVOLUTION_API_URL</code> e <code>EVOLUTION_API_KEY</code> no seu Supabase Edge Function e ter uma instância conectada em <strong>/conexoes</strong>.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">WhatsApp Number (com DDI)</label>
                        <Input
                            placeholder="ex: 5511999999999"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Formato internacional sem símbolos.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mensagem</label>
                        <Textarea
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua mensagem aqui..."
                        />
                    </div>

                    <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleSend}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar Mensagem
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
