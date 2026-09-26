import { notFound, redirect } from "next/navigation"
import { resolveViewerMode } from "@/app/actions/auth"
import { getMemberDashboardData } from "@/app/actions/gestor"
import {
  adminGetTargetMemberData,
  adminSaveDailyRecord, adminDeleteDailyRecord,
  adminCreateDelivery, adminUpdateDeliveryStatus, adminDeleteDelivery,
  adminCreateTransaction, adminUpdateTransaction, adminDeleteTransaction,
} from "@/app/actions/admin-override"
import { DashboardHeader } from "@/components/dashboard-header"
import { MemberPanelTabs } from "@/components/member-panel-tabs"

export default async function GestorEntregadorPage({ params }: { params: Promise<{ userId: string }> }) {
  let viewer
  try {
    viewer = await resolveViewerMode()
  } catch {
    redirect("/")
  }

  const { userId } = await params
  const targetUserId = Number(userId)
  if (!targetUserId) notFound()

  // ADMIN MASTER: acesso de escrita a QUALQUER organização, usando a MESMA
  // UI do entregador — nunca as actions normais de entregador (essas
  // continuam restritas ao dono do registro). Ver app/actions/admin-override.ts.
  if (viewer.mode === "admin") {
    const data = await adminGetTargetMemberData(targetUserId)
    if (!data) notFound()

    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <DashboardHeader
          userName={viewer.user.name}
          userEmail={viewer.user.email}
          panelName={data.member.name}
          viewerMode={{ entregadorName: data.member.name, mode: "admin" }}
        />
        <MemberPanelTabs
          panels={data.panels}
          actions={{
            onSaveDailyRecord: adminSaveDailyRecord.bind(null, data.organizationId, targetUserId),
            onDeleteDailyRecord: adminDeleteDailyRecord.bind(null, data.organizationId, targetUserId),
            onCreateDelivery: adminCreateDelivery.bind(null, data.organizationId, targetUserId),
            onUpdateDeliveryStatus: adminUpdateDeliveryStatus.bind(null, data.organizationId, targetUserId),
            onDeleteDelivery: adminDeleteDelivery.bind(null, data.organizationId, targetUserId),
            onCreateTransaction: adminCreateTransaction.bind(null, data.organizationId, targetUserId),
            onUpdateTransaction: adminUpdateTransaction.bind(null, data.organizationId, targetUserId),
            onDeleteTransaction: adminDeleteTransaction.bind(null, data.organizationId, targetUserId),
          }}
        />
      </main>
    )
  }

  // Fluxo normal do gestor: somente leitura, restrito à própria organização.
  // getMemberDashboardData já confirma que targetUserId tem membership de
  // entregador ativa na MESMA organização do gestor logado (anti-IDOR) —
  // retorna null se não pertencer, o que aqui vira 404 em vez de vazar dado.
  const data = await getMemberDashboardData(targetUserId, viewer)
  if (!data) notFound()

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <DashboardHeader
        userName={viewer.user.name}
        userEmail={viewer.user.email}
        panelName={data.member.name}
        viewerMode={{ entregadorName: data.member.name }}
      />
      <MemberPanelTabs panels={data.panels} />
    </main>
  )
}
