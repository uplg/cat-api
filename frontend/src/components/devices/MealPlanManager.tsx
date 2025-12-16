import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { feederApi, type MealPlanEntry } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
  Calendar,
  Utensils,
} from 'lucide-react'

const DAYS_OF_WEEK = [
  { short: 'L', full: 'Monday', label: 'Lun' },
  { short: 'M', full: 'Tuesday', label: 'Mar' },
  { short: 'M', full: 'Wednesday', label: 'Mer' },
  { short: 'J', full: 'Thursday', label: 'Jeu' },
  { short: 'V', full: 'Friday', label: 'Ven' },
  { short: 'S', full: 'Saturday', label: 'Sam' },
  { short: 'D', full: 'Sunday', label: 'Dim' },
]

interface MealPlanManagerProps {
  deviceId: string
  initialMealPlan: MealPlanEntry[] | null
}

function DaySelector({
  selectedDays,
  onChange,
}: {
  selectedDays: string[]
  onChange: (days: string[]) => void
}) {
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day))
    } else {
      onChange([...selectedDays, day])
    }
  }

  const selectAll = () => {
    onChange(DAYS_OF_WEEK.map((d) => d.full))
  }

  const selectWeekdays = () => {
    onChange(DAYS_OF_WEEK.slice(0, 5).map((d) => d.full))
  }

  const selectWeekend = () => {
    onChange(DAYS_OF_WEEK.slice(5).map((d) => d.full))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day.full}
            type="button"
            onClick={() => toggleDay(day.full)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
              selectedDays.includes(day.full)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
          Tous
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={selectWeekdays}>
          Semaine
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={selectWeekend}>
          Week-end
        </Button>
      </div>
    </div>
  )
}

interface MealEditorProps {
  meal?: MealPlanEntry
  onSave: (meal: MealPlanEntry) => void
  onCancel: () => void
}

function MealEditor({ meal, onSave, onCancel }: MealEditorProps) {
  const [time, setTime] = useState(meal?.time || '08:00')
  const [portion, setPortion] = useState([meal?.portion || 1])
  const [days, setDays] = useState<string[]>(
    meal?.days_of_week || DAYS_OF_WEEK.map((d) => d.full)
  )
  const [enabled, setEnabled] = useState(meal?.status !== 'Disabled')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (days.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Sélectionnez au moins un jour',
        variant: 'destructive',
      })
      return
    }
    onSave({
      time,
      portion: portion[0],
      days_of_week: days,
      status: enabled ? 'Enabled' : 'Disabled',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Time Picker */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Horaire
        </Label>
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="text-2xl font-mono h-14 text-center"
        />
      </div>

      {/* Portions */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Utensils className="h-4 w-4" />
          Portions
        </Label>
        <div className="flex items-center gap-4">
          <Slider
            value={portion}
            onValueChange={setPortion}
            min={1}
            max={12}
            step={1}
            className="flex-1"
          />
          <Badge variant="secondary" className="text-lg min-w-12 justify-center">
            {portion[0]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          1 à 12 portions par repas
        </p>
      </div>

      {/* Days */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Jours
        </Label>
        <DaySelector selectedDays={days} onChange={setDays} />
      </div>

      {/* Enabled */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Activer ce repas</Label>
          <p className="text-sm text-muted-foreground">
            Désactiver temporairement sans supprimer
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1">
          <Save className="mr-2 h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </form>
  )
}

export function MealPlanManager({ deviceId, initialMealPlan }: MealPlanManagerProps) {
  const queryClient = useQueryClient()
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>(initialMealPlan || [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync with initial data
  useEffect(() => {
    if (initialMealPlan) {
      setMealPlan(initialMealPlan)
      setHasChanges(false)
    }
  }, [initialMealPlan])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (plan: MealPlanEntry[]) => feederApi.setMealPlan(deviceId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeder', deviceId, 'meal-plan'] })
      setHasChanges(false)
      toast({
        title: '✅ Plan de repas sauvegardé',
        description: `${mealPlan.length} repas programmé${mealPlan.length > 1 ? 's' : ''}`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec de la sauvegarde',
        variant: 'destructive',
      })
    },
  })

  const addMeal = (meal: MealPlanEntry) => {
    if (mealPlan.length >= 10) {
      toast({
        title: 'Limite atteinte',
        description: 'Maximum 10 repas programmés',
        variant: 'destructive',
      })
      return
    }
    setMealPlan([...mealPlan, meal])
    setIsAddDialogOpen(false)
    setHasChanges(true)
  }

  const updateMeal = (index: number, meal: MealPlanEntry) => {
    const newPlan = [...mealPlan]
    newPlan[index] = meal
    setMealPlan(newPlan)
    setEditingIndex(null)
    setHasChanges(true)
  }

  const deleteMeal = (index: number) => {
    setMealPlan(mealPlan.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const toggleMealStatus = (index: number) => {
    const newPlan = [...mealPlan]
    newPlan[index] = {
      ...newPlan[index],
      status: newPlan[index].status === 'Enabled' ? 'Disabled' : 'Enabled',
    }
    setMealPlan(newPlan)
    setHasChanges(true)
  }

  const formatDays = (days: string[]) => {
    if (days.length === 7) return 'Tous les jours'
    if (days.length === 5 && !days.includes('Saturday') && !days.includes('Sunday')) {
      return 'Semaine'
    }
    if (days.length === 2 && days.includes('Saturday') && days.includes('Sunday')) {
      return 'Week-end'
    }
    return days
      .map((d) => DAYS_OF_WEEK.find((day) => day.full === d)?.label)
      .join(', ')
  }

  // Sort meals by time
  const sortedMealPlan = [...mealPlan].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="space-y-4">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Plan de repas</h3>
          <p className="text-sm text-muted-foreground">
            {mealPlan.length}/10 repas programmés
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={mealPlan.length >= 10}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Nouveau repas
                </DialogTitle>
                <DialogDescription>
                  Programmez un nouveau repas automatique
                </DialogDescription>
              </DialogHeader>
              <MealEditor
                onSave={addMeal}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            onClick={() => saveMutation.mutate(mealPlan)}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ Modifications non sauvegardées. Cliquez sur "Sauvegarder" pour appliquer les changements.
        </div>
      )}

      {/* Meal list */}
      {sortedMealPlan.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aucun repas programmé
            </p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Cliquez sur "Ajouter" pour créer votre premier repas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedMealPlan.map((meal) => {
            const originalIndex = mealPlan.indexOf(meal)
            
            return (
              <Card
                key={`${meal.time}-${originalIndex}`}
                className={`transition-all ${
                  meal.status === 'Disabled' ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Time display */}
                    <div
                      className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl ${
                        meal.status === 'Enabled'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Clock className="h-5 w-5 mb-1" />
                      <span className="text-lg font-bold">{meal.time}</span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          <Utensils className="mr-1 h-3 w-3" />
                          {meal.portion} portion{meal.portion > 1 ? 's' : ''}
                        </Badge>
                        <Badge
                          variant={meal.status === 'Enabled' ? 'success' : 'secondary'}
                        >
                          {meal.status === 'Enabled' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatDays(meal.days_of_week)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={meal.status === 'Enabled'}
                        onCheckedChange={() => toggleMealStatus(originalIndex)}
                      />
                      
                      <Dialog
                        open={editingIndex === originalIndex}
                        onOpenChange={(open) => setEditingIndex(open ? originalIndex : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Edit2 className="h-5 w-5" />
                              Modifier le repas
                            </DialogTitle>
                            <DialogDescription>
                              Modifiez les paramètres de ce repas
                            </DialogDescription>
                          </DialogHeader>
                          <MealEditor
                            meal={meal}
                            onSave={(updated) => updateMeal(originalIndex, updated)}
                            onCancel={() => setEditingIndex(null)}
                          />
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMeal(originalIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {mealPlan.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total portions par jour (si tous actifs) :
              </span>
              <Badge variant="outline" className="text-base">
                ~{mealPlan
                  .filter((m) => m.status === 'Enabled')
                  .reduce((acc, m) => acc + m.portion, 0)}{' '}
                portions
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
