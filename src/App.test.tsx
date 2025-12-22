import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    expect(
      screen.getByText('Electrician Invoice Generator')
    ).toBeInTheDocument()
  })

  it('shows project setup complete message', () => {
    render(<App />)
    expect(screen.getByText('Project Setup Complete')).toBeInTheDocument()
  })
})