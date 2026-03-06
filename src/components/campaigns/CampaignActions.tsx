import { useState } from "react";
import { MoreVertical, Play, Pause, DollarSign, Copy, Archive } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCampaignManager } from "@/hooks/useCampaignManager";

interface CampaignActionsProps {
  campaignId: string;
  campaignName: string;
  currentStatus: string;
  clientId: string;
}

export function CampaignActions({ campaignId, campaignName, currentStatus, clientId }: CampaignActionsProps) {
  const mgr = useCampaignManager(clientId);

  // Dialogs
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  // Budget
  const [newBudget, setNewBudget] = useState("");

  // Duplicate
  const [dupName, setDupName] = useState("");
  const [dupMultiplier, setDupMultiplier] = useState("100");

  const isActive = currentStatus === "ACTIVE" || currentStatus === "Ativa";
  const isPaused = currentStatus === "PAUSED" || currentStatus === "Pausada";
  const canToggle = isActive || isPaused;

  if (!campaignId) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canToggle && (
            <DropdownMenuItem onClick={() => setConfirmToggle(true)}>
              {isActive ? (
                <><Pause className="h-4 w-4 mr-2" /> Pausar</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Ativar</>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => { setNewBudget(""); setBudgetOpen(true); }}>
            <DollarSign className="h-4 w-4 mr-2" /> Alterar budget
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setDupName(`${campaignName} - Cópia`); setDupMultiplier("100"); setDuplicateOpen(true); }}>
            <Copy className="h-4 w-4 mr-2" /> Duplicar campanha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmArchive(true)}
            className="text-destructive focus:text-destructive"
          >
            <Archive className="h-4 w-4 mr-2" /> Arquivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Toggle status confirmation */}
      <AlertDialog open={confirmToggle} onOpenChange={setConfirmToggle}>
        <AlertDialogContent className="bg-card border-white/5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {isActive ? "Pausar campanha" : "Ativar campanha"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {isActive ? "pausar" : "ativar"} a campanha "{campaignName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await mgr.updateStatus(campaignId, isActive ? "PAUSED" : "ACTIVE");
                setConfirmToggle(false);
              }}
              disabled={mgr.isUpdating}
            >
              {isActive ? "Pausar" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation */}
      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent className="bg-card border-white/5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Arquivar campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar "{campaignName}"?
              <br />
              <span className="text-destructive text-xs font-medium">Essa ação não pode ser desfeita facilmente.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await mgr.updateStatus(campaignId, "ARCHIVED");
                setConfirmArchive(false);
              }}
              disabled={mgr.isUpdating}
              className="bg-destructive hover:bg-destructive/80"
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Budget dialog */}
      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-white/5">
          <DialogHeader>
            <DialogTitle className="text-foreground">Alterar budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-muted-foreground">Novo budget diário (R$)</Label>
            <Input
              type="number"
              min={5}
              step="0.01"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value)}
              placeholder="Ex: 50.00"
              className="bg-[var(--surface2)]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                await mgr.updateBudget(campaignId, Number(newBudget));
                setBudgetOpen(false);
              }}
              disabled={!newBudget || Number(newBudget) < 5 || mgr.isUpdating}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate dialog */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="sm:max-w-md bg-card border-white/5">
          <DialogHeader>
            <DialogTitle className="text-foreground">Duplicar campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome da nova campanha</Label>
              <Input
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                className="bg-[var(--surface2)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">% do budget original</Label>
              <Input
                type="number"
                min={10}
                max={200}
                value={dupMultiplier}
                onChange={(e) => setDupMultiplier(e.target.value)}
                className="bg-[var(--surface2)]"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">A campanha será criada como PAUSADA</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                await mgr.duplicateCampaign(campaignId, dupName, Number(dupMultiplier) / 100);
                setDuplicateOpen(false);
              }}
              disabled={!dupName.trim() || mgr.isUpdating}
            >
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
