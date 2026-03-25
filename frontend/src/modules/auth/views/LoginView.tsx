import { LoginForm } from '../components/LoginForm'

export const LoginView = () => {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <span className="text-text-inverse font-bold text-lg">MC</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">ERP MC</h1>
          <p className="text-text-secondary text-sm mt-1">Ingresa con tu cuenta</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl shadow-md p-8 border border-surface-border">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
