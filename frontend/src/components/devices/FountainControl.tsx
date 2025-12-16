import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fountainApi } from '@/lib/api'
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
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import {
  Droplets,
  Loader2,
  Power,
  Sun,
  Leaf,
  RefreshCw,
  AlertTriangle,
  Filter,
  Gauge,
} from 'lucide-react'

interface FountainControlProps {
  deviceId: string
}

export function FountainControl({ deviceId }: FountainControlProps) {
  const queryClient = useQueryClient()

  // Fetch fountain status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['fountain', deviceId, 'status'],
    queryFn: () => fountainApi.status(deviceId),
    refetchInterval: 15000,
  })

  // Mutations
  const powerMutation = useMutation({
    mutationFn: (enabled: boolean) => fountainApi.power(deviceId, enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['fountain', deviceId] })
      toast({
        title: enabled ? '💧 Fontaine allumée' : '⏸️ Fontaine éteinte',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec',
        variant: 'destructive',
      })
    },
  })

  const uvMutation = useMutation({
    mutationFn: (enabled: boolean) => fountainApi.setUV(deviceId, enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['fountain', deviceId] })
      toast({
        title: enabled ? '☀️ UV activés' : '🌙 UV désactivés',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec',
        variant: 'destructive',
      })
    },
  })

  const ecoModeMutation = useMutation({
    mutationFn: (enabled: boolean) => fountainApi.setEcoMode(deviceId, enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['fountain', deviceId] })
      toast({
        title: enabled ? '🌿 Mode éco activé' : 'Mode éco désactivé',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec',
        variant: 'destructive',
      })
    },
  })

  const resetWaterMutation = useMutation({
    mutationFn: () => fountainApi.resetWater(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fountain', deviceId] })
      toast({ title: '💧 Compteur d\'eau réinitialisé' })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec',
        variant: 'destructive',
      })
    },
  })

  const resetFilterMutation = useMutation({
    mutationFn: () => fountainApi.resetFilter(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fountain', deviceId] })
      toast({ title: '🔄 Compteur filtre réinitialisé' })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec',
        variant: 'destructive',
      })
    },
  })

  const resetPumpMutation = useMutation({
    mutationFn: () => fountainApi.resetPump(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fountain', deviceId] })
      toast({ title: '⚙️ Compteur pompe réinitialisé' })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec',
        variant: 'destructive',
      })
    },
  })

  const parsedStatus = statusData?.parsed_status as {
    power?: boolean
    uv_enabled?: boolean
    eco_mode?: boolean
    water_level?: string
    filter_life?: number
    pump_time?: number
    water_time?: number
  } | undefined

  const isAnyMutating =
    powerMutation.isPending ||
    uvMutation.isPending ||
    ecoModeMutation.isPending

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Contrôles
          </CardTitle>
          <CardDescription>
            Gérez le fonctionnement de la fontaine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Power className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label>Alimentation</Label>
                <p className="text-sm text-muted-foreground">
                  Allumer ou éteindre la fontaine
                </p>
              </div>
            </div>
            <Switch
              checked={parsedStatus?.power ?? false}
              onCheckedChange={(checked) => powerMutation.mutate(checked)}
              disabled={isAnyMutating}
            />
          </div>

          <Separator />

          {/* UV */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Sun className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <Label>Stérilisation UV</Label>
                <p className="text-sm text-muted-foreground">
                  Purifier l'eau avec les UV
                </p>
              </div>
            </div>
            <Switch
              checked={parsedStatus?.uv_enabled ?? false}
              onCheckedChange={(checked) => uvMutation.mutate(checked)}
              disabled={isAnyMutating}
            />
          </div>

          <Separator />

          {/* Eco Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Leaf className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label>Mode Éco</Label>
                <p className="text-sm text-muted-foreground">
                  Économiser l'énergie
                </p>
              </div>
            </div>
            <Switch
              checked={parsedStatus?.eco_mode ?? false}
              onCheckedChange={(checked) => ecoModeMutation.mutate(checked)}
              disabled={isAnyMutating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status & Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>État & Maintenance</CardTitle>
          <CardDescription>
            Surveillez et entretenez votre fontaine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Water Level */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Niveau d'eau</span>
              </div>
              <Badge
                variant={
                  parsedStatus?.water_level === 'low'
                    ? 'destructive'
                    : parsedStatus?.water_level === 'medium'
                    ? 'warning'
                    : 'success'
                }
              >
                {parsedStatus?.water_level === 'low'
                  ? 'Bas'
                  : parsedStatus?.water_level === 'medium'
                  ? 'Moyen'
                  : 'OK'}
              </Badge>
            </div>
            {parsedStatus?.water_level === 'low' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Ajoutez de l'eau !
              </div>
            )}
          </div>

          <Separator />

          {/* Filter Life */}
          {parsedStatus?.filter_life !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Durée de vie filtre</span>
                </div>
                <span className="text-sm">{parsedStatus.filter_life}%</span>
              </div>
              <Progress value={parsedStatus.filter_life} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetFilterMutation.mutate()}
                disabled={resetFilterMutation.isPending}
                className="w-full"
              >
                {resetFilterMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Réinitialiser (filtre changé)
              </Button>
            </div>
          )}

          <Separator />

          {/* Pump Time */}
          {parsedStatus?.pump_time !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Temps pompe</span>
                </div>
                <span className="text-sm">{parsedStatus.pump_time}h</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetPumpMutation.mutate()}
                disabled={resetPumpMutation.isPending}
                className="w-full"
              >
                {resetPumpMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Réinitialiser (pompe nettoyée)
              </Button>
            </div>
          )}

          {/* Water Time Reset */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Eau fraîche</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetWaterMutation.mutate()}
              disabled={resetWaterMutation.isPending}
              className="w-full"
            >
              {resetWaterMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              J'ai changé l'eau
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
