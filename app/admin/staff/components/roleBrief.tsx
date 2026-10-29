'use client'

import { Button } from '../../../../shared/button'

export type RoleBriefData = {
  roleName: string
  reportsTo?: string
  summary?: string
  responsibilities?: string
  qualifications?: string
}

function Block({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="mb-3">
      <h6 className="font-semibold text-slate-800 mb-1">{label}</h6>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export function RoleBrief({
  brief,
  acknowledged,
  acknowledging,
  onAcknowledge,
}: {
  brief: RoleBriefData | null | undefined
  acknowledged?: boolean
  acknowledging?: boolean
  onAcknowledge?: () => void
}) {
  if (!brief) {
    return (
      <section className="border rounded p-4 mb-4">
        <h5>Role responsibilities</h5>
        <p className="text-sm text-slate-500">No job description is saved for this role yet.</p>
      </section>
    )
  }

  return (
    <section className="border rounded p-4 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h5 className="mb-1">Role responsibilities</h5>
          <p className="text-sm text-slate-600">
            What a {brief.roleName} is expected to do. Read this during onboarding.
          </p>
        </div>
        {onAcknowledge && !acknowledged ? (
          <Button variant="dark" size="sm" onClick={onAcknowledge} disabled={acknowledging}>
            I&apos;ve read this
          </Button>
        ) : null}
        {acknowledged ? (
          <span className="text-sm text-green-700">Acknowledged</span>
        ) : null}
      </div>
      <Block label="Reports to" value={brief.reportsTo} />
      <Block label="Summary" value={brief.summary} />
      <Block label="Responsibilities" value={brief.responsibilities} />
      <Block label="Qualifications" value={brief.qualifications} />
    </section>
  )
}
