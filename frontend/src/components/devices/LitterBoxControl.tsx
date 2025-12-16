import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { litterBoxApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  Trash2,
  Loader2,
  Moon,
  Lock,
  Baby,
  Lightbulb,
  Volume2,
  Home,
  Settings,
  AlertTriangle,
  RefreshCw,
  Play,
} from 'lucide-react'

interface LitterBoxControlProps {
  deviceId: string
}

export function LitterBoxControl({ deviceId }: LitterBoxControlProps) {
  const queryClient = useQueryClient()
  const [cleanDelay, setCleanDelay] = useState([120])
  const [sleepStart, setSleepStart] = useState('23:00')
  const [sleepEnd, setSleepEnd] = useState('07:00')
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  // Fetch litter box status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['litter-box', deviceId, 'status'],
    queryFn: () => litterBoxApi.status(deviceId),
    refetchInterval: 15000,
  })

  // Clean mutation
  const cleanMutation = useMutation({
    mutationFn: () => litterBoxApi.clean(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litter-box', deviceId] })
      toast({
        title: '🧹 Nettoyage lancé !',
        description: 'Le cycle de nettoyage a démarré',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec du nettoyage',
        variant: 'destructive',
      })
    },
  })

  // Settings mutation
  const settingsMutation = useMutation({
    mutationFn: (settings: Parameters<typeof litterBoxApi.settings>[1]) =>
      litterBoxApi.settings(deviceId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litter-box', deviceId] })
      toast({
        title: '✅ Paramètres mis à jour',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec de la mise à jour',
        variant: 'destructive',
      })
    },
  })

  const parsedStatus = statusData?.parsed_status as {
    clean_delay?: {
      seconds?: number
      formatted?: string
    }
    sleep_mode?: {
      enabled?: boolean
      start_time_minutes?: number
      start_time_formatted?: string
      end_time_minutes?: number
      end_time_formatted?: string
    }
    sensors?: {
      litter_level?: string
      defecation_frequency?: number
      defecation_duration?: number
      fault_alarm?: number
    }
    system?: {
      state?: string
      cleaning_in_progress?: boolean
      maintenance_required?: boolean
    }
    settings?: {
      lighting?: boolean
      child_lock?: boolean
      prompt_sound?: boolean
      kitten_mode?: boolean
      automatic_homing?: boolean
    }
  } | undefined

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-37.5" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-75 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-37.5" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-75 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Tabs defaultValue="control" className="space-y-4">
      <TabsList>
        <TabsTrigger value="control">
          <Play className="mr-2 h-4 w-4" />
          Contrôle
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" />
          Paramètres
        </TabsTrigger>
      </TabsList>

      <TabsContent value="control" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Actions rapides
              </CardTitle>
              <CardDescription>
                Contrôlez votre litière intelligente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => cleanMutation.mutate()}
                disabled={cleanMutation.isPending}
                className="w-full"
                size="lg"
              >
                {cleanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Nettoyage en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-5 w-5" />
                    Lancer le nettoyage
                  </>
                )}
              </Button>

              <Separator />

              <div className="space-y-3">
                <Label>Délai avant nettoyage automatique</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={cleanDelay}
                    onValueChange={setCleanDelay}
                    min={60}
                    max={1800}
                    step={60}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="min-w-15 justify-center">
                    {Math.floor(cleanDelay[0] / 60)} min
                  </Badge>
                </div>
                {parsedStatus?.clean_delay?.seconds && (
                  <p className="text-sm text-muted-foreground">
                    Valeur actuelle: {parsedStatus.clean_delay.formatted}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    settingsMutation.mutate({ clean_delay: cleanDelay[0] })
                  }
                  disabled={settingsMutation.isPending}
                  className="w-full"
                >
                  {settingsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Appliquer le délai
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>État de la litière</CardTitle>
              <CardDescription>Informations en temps réel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sand Level */}
              {parsedStatus?.sensors?.litter_level && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Niveau de litière</span>
                    <Badge variant={parsedStatus.sensors.litter_level === 'full' ? 'success' : 'outline'}>
                      {parsedStatus.sensors.litter_level === 'full' ? '✓ Rempli' : parsedStatus.sensors.litter_level === 'half' ? '½ Moyen' : parsedStatus.sensors.litter_level}
                    </Badge>
                  </div>
                  {parsedStatus.sensors.litter_level === 'half' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      Pensez à remplir bientôt
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Statut</span>
                <Badge
                  variant={
                    parsedStatus?.system?.state === 'cleaning'
                      ? 'default'
                      : parsedStatus?.system?.state === 'cat_inside'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {parsedStatus?.system?.state === 'cleaning'
                    ? '🧹 Nettoyage'
                    : parsedStatus?.system?.state === 'cat_inside'
                    ? '🐱 Chat dedans'
                    : parsedStatus?.system?.state === 'clumping'
                    ? '⏱️ Agglomération'
                    : parsedStatus?.system?.state === 'satnd_by'
                    ? '💤 Veille'
                    : parsedStatus?.system?.state || 'Inconnu'}
                </Badge>
              </div>

              {parsedStatus?.system?.maintenance_required && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Maintenance requise</span>
                  </div>
                </>
              )}

              {parsedStatus?.sensors?.fault_alarm !== 0 && parsedStatus?.sensors?.fault_alarm !== undefined && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Alarme défaut: {parsedStatus.sensors.fault_alarm}</span>
                  </div>
                </>
              )}

              <Separator />

              {/* Reset Sand Level */}
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réinitialiser le niveau de litière
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Réinitialiser le niveau ?</DialogTitle>
                    <DialogDescription>
                      Confirmez que vous avez rempli la litière. Le compteur sera remis à 100%.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsResetDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => {
                        settingsMutation.mutate({
                          actions: { reset_sand_level: true },
                        })
                        setIsResetDialogOpen(false)
                      }}
                    >
                      Confirmer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sleep Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Mode nuit
              </CardTitle>
              <CardDescription>
                Désactive le nettoyage automatique pendant la nuit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer le mode nuit</Label>
                <Switch
                  checked={parsedStatus?.sleep_mode?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      sleep_mode: { enabled: checked },
                    })
                  }
                  disabled={settingsMutation.isPending}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Début</Label>
                  <Input
                    type="time"
                    value={sleepStart}
                    onChange={(e) => setSleepStart(e.target.value)}
                  />
                  {parsedStatus?.sleep_mode?.start_time_formatted && (
                    <p className="text-xs text-muted-foreground">
                      Actuel: {parsedStatus.sleep_mode.start_time_formatted}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Fin</Label>
                  <Input
                    type="time"
                    value={sleepEnd}
                    onChange={(e) => setSleepEnd(e.target.value)}
                  />
                  {parsedStatus?.sleep_mode?.end_time_formatted && (
                    <p className="text-xs text-muted-foreground">
                      Actuel: {parsedStatus.sleep_mode.end_time_formatted}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  settingsMutation.mutate({
                    sleep_mode: {
                      start_time: sleepStart,
                      end_time: sleepEnd,
                    },
                  })
                }
                disabled={settingsMutation.isPending}
                className="w-full"
              >
                Appliquer les horaires
              </Button>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Préférences
              </CardTitle>
              <CardDescription>
                Personnalisez le comportement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Child Lock */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label>Verrouillage enfant</Label>
                </div>
                <Switch
                  checked={parsedStatus?.settings?.child_lock ?? false}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      preferences: { child_lock: checked },
                    })
                  }
                  disabled={settingsMutation.isPending}
                />
              </div>

              <Separator />

              {/* Kitten Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-muted-foreground" />
                  <Label>Mode chaton</Label>
                </div>
                <Switch
                  checked={parsedStatus?.settings?.kitten_mode ?? false}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      preferences: { kitten_mode: checked },
                    })
                  }
                  disabled={settingsMutation.isPending}
                />
              </div>

              <Separator />

              {/* Lighting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <Label>Éclairage</Label>
                </div>
                <Switch
                  checked={parsedStatus?.settings?.lighting ?? false}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      preferences: { lighting: checked },
                    })
                  }
                  disabled={settingsMutation.isPending}
                />
              </div>

              <Separator />

              {/* Prompt Sound */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Label>Sons</Label>
                </div>
                <Switch
                  checked={parsedStatus?.settings?.prompt_sound ?? false}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      preferences: { prompt_sound: checked },
                    })
                  }
                  disabled={settingsMutation.isPending}
                />
              </div>

              <Separator />

              {/* Automatic Homing */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <Label>Retour automatique</Label>
                </div>
                <Switch
                  checked={parsedStatus?.settings?.automatic_homing ?? false}
                  onCheckedChange={(checked) =>
                    settingsMutation.mutate({
                      preferences: { automatic_homing: checked },
                    })
                  }
                  disabled={settingsMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
