import { useQuery } from '@tanstack/react-query'
import { fetchBuildings, buildingKeys, type BuildingFilters } from '@/lib/queries/buildings'

export function useBuildings(filters: BuildingFilters = {}) {
  return useQuery({
    queryKey: buildingKeys.list(filters),
    queryFn: () => fetchBuildings(filters),
  })
}
