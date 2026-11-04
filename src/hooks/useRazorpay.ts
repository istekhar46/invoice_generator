import { useQuery } from '@tanstack/react-query'
import { useUserProfile } from './useAuth'
import { razorpayApi } from '../services/api/razorpayApi'
import { queryKeys } from '../lib/queryKeys'

export function useRazorpaySetup() {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [...queryKeys.razorpay, user?.id],
    enabled: !!user?.id,
    queryFn: ({ signal }) => razorpayApi.list(signal),
    retry: false,
    staleTime: 0,
  })
}
