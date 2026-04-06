import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  campaign_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string | null; email: string | null };
}

interface CampaignCommentsProps {
  campaignId: string;
}

export function CampaignComments({ campaignId }: CampaignCommentsProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["campaign-comments", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_comments")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for all user_ids
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        if (profiles) {
          profiles.forEach((p: any) => { profileMap[p.id] = { full_name: p.full_name, email: p.email }; });
        }
      }

      return (data || []).map((c: any) => ({
        ...c,
        profile: profileMap[c.user_id] || null,
      })) as Comment[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("campaign_comments")
        .insert({ campaign_id: campaignId, user_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-comments", campaignId] });
      setNewComment("");
    },
  });

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    if (email) return email[0].toUpperCase();
    return "?";
  };

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Comentários {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comments list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <Avatar className="h-6 w-6 shrink-0 mt-0.5">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(comment.profile?.full_name, comment.profile?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-foreground">
                  {comment.profile?.full_name || comment.profile?.email || "Usuário"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum comentário ainda
          </p>
        )}
      </div>

      {/* Add comment */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 min-h-[60px] text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button
          size="icon"
          className="h-[60px] w-10 shrink-0"
          onClick={handleSubmit}
          disabled={addMutation.isPending || !newComment.trim()}
        >
          {addMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
