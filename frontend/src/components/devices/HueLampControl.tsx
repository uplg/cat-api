import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { hueLampsApi, type HueLamp } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import {
  Lightbulb,
  LightbulbOff,
  Loader2,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from 'lucide-react'

interface HueLampControlProps {
  lampId: string
}

export function HueLampControl({ lampId }: HueLampControlProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['hue-lamp', lampId],
    queryFn: () => hueLampsApi.status(lampId),
    refetchInterval: 3000,
  })

  const lamp = data?.lamp

  // Local brightness state with optimistic updates
  const [localBrightness, setLocalBrightness] = useState<number[]>([lamp?.state.brightness ?? 100])
  // Target brightness - we ignore server updates until server reaches this value
  const targetBrightnessRef = useRef<number | null>(null)

  const powerMutation = useMutation({
    mutationFn: (enabled: boolean) => hueLampsApi.power(lampId, enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['hue-lamp', lampId] })
      queryClient.invalidateQueries({ queryKey: ['hue-lamps'] })
      toast({
        title: enabled ? t('hueLamps.lampOn') : t('hueLamps.lampOff'),
        description: t('hueLamps.powerChanged'),
      })
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('hueLamps.powerFailed'),
        variant: 'destructive',
      })
    },
  })

  const brightnessMutation = useMutation({
    mutationFn: (value: number) => hueLampsApi.brightness(lampId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hue-lamp', lampId] })
      queryClient.invalidateQueries({ queryKey: ['hue-lamps'] })
    },
    onError: (error) => {
      // Reset target on error so we can resync
      targetBrightnessRef.current = null
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('hueLamps.brightnessFailed'),
        variant: 'destructive',
      })
    },
  })

  // Optimistic sync: ignore server values until they match our target (±2% tolerance)
  useEffect(() => {
    if (lamp?.state.brightness === undefined) return
    
    const serverValue = lamp.state.brightness
    const target = targetBrightnessRef.current
    
    // If we have a target, only sync when server reaches it
    if (target !== null) {
      const isClose = Math.abs(serverValue - target) <= 2
      if (isClose) {
        // Server reached target, clear it and sync
        targetBrightnessRef.current = null
        setLocalBrightness([serverValue])
      }
      // Otherwise ignore intermediate values
    } else {
      // No target, sync normally
      setLocalBrightness([serverValue])
    }
  }, [lamp?.state.brightness])

  const handleBrightnessCommit = (value: number[]) => {
    const newValue = value[0]
    // Set target for optimistic update
    targetBrightnessRef.current = newValue
    setLocalBrightness([newValue])
    brightnessMutation.mutate(newValue)
  }

  const handlePowerToggle = (checked: boolean) => {
    powerMutation.mutate(checked)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!lamp) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <LightbulbOff className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{t('hueLamps.notFound')}</p>
        </CardContent>
      </Card>
    )
  }

  const isConnected = lamp.connected
  const isOn = lamp.state.isOn

  return (
    <div className="space-y-4">
      {/* Power Control Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  isOn
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isOn ? (
                  <Lightbulb className="h-6 w-6" />
                ) : (
                  <LightbulbOff className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {lamp.name}
                  {isConnected ? (
                    <Badge variant="success">
                      <Wifi className="mr-1 h-3 w-3" />
                      {t('common.connected')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <WifiOff className="mr-1 h-3 w-3" />
                      {t('common.disconnected')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {lamp.model || t('hueLamps.unknownModel')} • {lamp.manufacturer}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={isOn}
              onCheckedChange={handlePowerToggle}
              disabled={!isConnected || powerMutation.isPending}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Brightness Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            {t('hueLamps.brightness')}
          </CardTitle>
          <CardDescription>
            {t('hueLamps.brightnessDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brightness Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('hueLamps.currentBrightness')}</Label>
              <span className="text-2xl font-bold">
                {localBrightness[0]}%
              </span>
            </div>
            <Slider
              value={localBrightness}
              onValueChange={setLocalBrightness}
              onValueCommit={handleBrightnessCommit}
              min={1}
              max={100}
              step={1}
              disabled={!isConnected || !isOn}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Status indicator */}
          {brightnessMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('hueLamps.updating')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('hueLamps.deviceInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('hueLamps.model')}</span>
              <p className="font-medium">{lamp.model || t('common.unknown')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('hueLamps.manufacturer')}</span>
              <p className="font-medium">{lamp.manufacturer}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('hueLamps.firmware')}</span>
              <p className="font-medium">{lamp.firmware || t('common.unknown')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('hueLamps.address')}</span>
              <p className="font-mono text-xs">{lamp.address}</p>
            </div>
            {lamp.lastSeen && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{t('hueLamps.lastSeen')}</span>
                <p className="font-medium">
                  {new Date(lamp.lastSeen).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection warning */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {t('hueLamps.notConnected')}
                </p>
                <p className="text-sm text-yellow-700">
                  {t('hueLamps.notConnectedDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Compact Hue Lamp Card for Dashboard
 */
interface HueLampCardProps {
  lamp: HueLamp
}

export function HueLampCard({ lamp }: HueLampCardProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const powerMutation = useMutation({
    mutationFn: (enabled: boolean) => hueLampsApi.power(lamp.id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hue-lamps'] })
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('hueLamps.powerFailed'),
        variant: 'destructive',
      })
    },
  })

  const brightnessMutation = useMutation({
    mutationFn: (value: number) => hueLampsApi.brightness(lamp.id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hue-lamps'] })
    },
  })

  const [localBrightness, setLocalBrightness] = useState([lamp.state.brightness])
  const targetBrightnessRef = useRef<number | null>(null)

  // Optimistic sync: ignore server values until they match our target (±2% tolerance)
  useEffect(() => {
    const serverValue = lamp.state.brightness
    const target = targetBrightnessRef.current
    
    if (target !== null) {
      const isClose = Math.abs(serverValue - target) <= 2
      if (isClose) {
        targetBrightnessRef.current = null
        setLocalBrightness([serverValue])
      }
    } else {
      setLocalBrightness([serverValue])
    }
  }, [lamp.state.brightness])

  const handleBrightnessCommit = (value: number[]) => {
    const newValue = value[0]
    targetBrightnessRef.current = newValue
    setLocalBrightness([newValue])
    brightnessMutation.mutate(newValue)
  }

  const isOn = lamp.state.isOn
  const isConnected = lamp.connected

  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isOn
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isOn ? (
                <Lightbulb className="h-5 w-5" />
              ) : (
                <LightbulbOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <Link to={`/hue-lamp/${lamp.id}`}>
                <CardTitle className="text-base hover:underline cursor-pointer">{lamp.name}</CardTitle>
              </Link>
              <CardDescription className="text-xs">
                {lamp.model || t('hueLamps.unknownModel')}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isOn}
            onCheckedChange={(checked) => powerMutation.mutate(checked)}
            disabled={!isConnected || powerMutation.isPending}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection status */}
        <div className="flex items-center justify-between text-xs">
          {isConnected ? (
            <Badge variant="success" className="text-xs">
              <Wifi className="mr-1 h-2.5 w-2.5" />
              {t('common.connected')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <WifiOff className="mr-1 h-2.5 w-2.5" />
              {t('common.disconnected')}
            </Badge>
          )}
          <span className="text-muted-foreground">
            {localBrightness[0]}%
          </span>
        </div>

        {/* Mini brightness slider */}
        <Slider
          value={localBrightness}
          onValueChange={setLocalBrightness}
          onValueCommit={handleBrightnessCommit}
          min={1}
          max={100}
          step={1}
          disabled={!isConnected || !isOn}
          className="cursor-pointer"
        />
      </CardContent>
    </Card>
  )
}
