import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { navigationService } from '../../services'

interface NavigationProviderProps {
  children: React.ReactNode
}

/**
 * NavigationProvider component that initializes the navigation service
 * with React Router's navigate function
 */
export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize the navigation service with the navigate function
    navigationService.setNavigate(navigate)
  }, [navigate])

  return <>{children}</>
}