
import { supabase } from "@/lib/supabase";

export interface SendMessageResponse {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Sends a WhatsApp message via Evolution API (through Supabase Edge Function)
 * @param phone Phone number in international format (e.g. 5511999999999)
 * @param message Text message content
 */
export const sendWhatsAppMessage = async (phone: string, message: string): Promise<SendMessageResponse> => {
    try {
        const { data, error } = await supabase.functions.invoke('evolution-whatsapp', {
            body: {
                action: 'send-message',
                phone,
                message
            }
        });

        if (error) throw error;

        return data as SendMessageResponse;
    } catch (error: any) {
        console.error('Error sending WhatsApp message:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
};
