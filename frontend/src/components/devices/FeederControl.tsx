import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feederApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import {
  Utensils,
  Loader2,
  Clock,
  Battery,
  AlertTriangle,
  Calendar,
} from 'lucide-react'

interface FeederControlProps {
  deviceId: string
}

export function FeederControl({ deviceId }: FeederControlProps) {
  const queryClient = useQueryClient()
  const [portions, setPortions] = useState([1])

  // Fetch feeder status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['feeder', deviceId, 'status'],
    queryFn: () => feederApi.status(deviceId),
    refetchInterval: 15000,
  })

  // Fetch meal plan
  const { data: mealPlanData, isLoading: isLoadingMealPlan } = useQuery({
    queryKey: ['feeder', deviceId, 'meal-plan'],
    queryFn: () => feederApi.getMealPlan(deviceId),
  })

  // Feed mutation
  const feedMutation = useMutation({
    mutationFn: (portion: number) => feederApi.feed(deviceId, portion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeder', deviceId] })
      toast({
        title: '🍽️ Repas distribué !',
        description: `${portions[0]} portion${portions[0] > 1 ? 's' : ''} distribuée${portions[0] > 1 ? 's' : ''}`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec de la distribution',
        variant: 'destructive',
      })
    },
  })

  const parsedStatus = statusData?.parsed_status as {
    food_level?: string
    battery_level?: number
    is_feeding?: boolean
    error?: string
  } | undefined

  return (
    <Tabs defaultValue="control" className="space-y-4">
      <TabsList>
        <TabsTrigger value="control">
          <Utensils className="mr-2 h-4 w-4" />
          Contrôle
        </TabsTrigger>
        <TabsTrigger value="schedule">
          <Calendar className="mr-2 h-4 w-4" />
          Programmation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="control" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Feed Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Distribution manuelle
              </CardTitle>
              <CardDescription>
                Distribuez des croquettes à votre chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Portions</span>
                  <Badge variant="outline" className="text-lg">
                    {portions[0]}
                  </Badge>
                </div>
                <Slider
                  value={portions}
                  onValueChange={setPortions}
                  min={1}
                  max={10}
                  step={1}
                  disabled={feedMutation.isPending}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 portion</span>
                  <span>10 portions</span>
                </div>
              </div>
              <Button
                onClick={() => feedMutation.mutate(portions[0])}
                disabled={feedMutation.isPending}
                className="w-full"
                size="lg"
              >
                {feedMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Distribution en cours...
                  </>
                ) : (
                  <>
                    <Utensils className="mr-2 h-5 w-5" />
                    Distribuer {portions[0]} portion{portions[0] > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>État du distributeur</CardTitle>
              <CardDescription>Informations en temps réel</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : parsedStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-muted-foreground" />
                      <span>Niveau de nourriture</span>
                    </div>
                    <Badge
                      variant={
                        parsedStatus.food_level === 'low'
                          ? 'destructive'
                          : parsedStatus.food_level === 'medium'
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {parsedStatus.food_level === 'low'
                        ? 'Bas'
                        : parsedStatus.food_level === 'medium'
                        ? 'Moyen'
                        : 'Plein'}
                    </Badge>
                  </div>
                  <Separator />
                  {parsedStatus.battery_level !== undefined && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Battery className="h-4 w-4 text-muted-foreground" />
                          <span>Batterie</span>
                        </div>
                        <Badge
                          variant={
                            parsedStatus.battery_level < 20
                              ? 'destructive'
                              : parsedStatus.battery_level < 50
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {parsedStatus.battery_level}%
                        </Badge>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Statut</span>
                    </div>
                    <Badge variant={parsedStatus.is_feeding ? 'default' : 'outline'}>
                      {parsedStatus.is_feeding ? 'En distribution' : 'En attente'}
                    </Badge>
                  </div>
                  {parsedStatus.error && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{parsedStatus.error}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Impossible de récupérer le statut
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="schedule" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Programmation des repas
            </CardTitle>
            <CardDescription>
              Gérez les horaires de distribution automatique
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMealPlan ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : mealPlanData?.decoded ? (
              <div className="space-y-4">
                {mealPlanData.decoded.map((meal, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${
                          meal.status === 'Enabled'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium">{meal.time}</p>
                        <p className="text-sm text-muted-foreground">
                          {meal.portion} portion{meal.portion > 1 ? 's' : ''} •{' '}
                          {meal.days_of_week.length === 7
                            ? 'Tous les jours'
                            : meal.days_of_week.join(', ')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={meal.status === 'Enabled' ? 'success' : 'secondary'}>
                      {meal.status === 'Enabled' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Aucun repas programmé
                </p>
                <p className="text-sm text-muted-foreground">
                  {mealPlanData?.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
