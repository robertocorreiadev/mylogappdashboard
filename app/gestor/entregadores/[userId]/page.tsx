import { notFound, redirect } from "next/navigation"
import { resolveViewerMode } from "@/app/actions/auth"
import { getMemberDashboardData } from "@/app/actions/gestor"
import {
  adminGetTargetMemberData,
  adminSaveDailyRecord, adminDeleteDailyRecord,
  adminCreateDelivery, adminUpdateDelivery, adminUpdateDeliveryStatus, adminDeleteDelivery,
  adminCreateTransaction, adminUpdateTransaction, adminDeleteTransaction,
} from "@/app/actions/admin-override"
import { AppShell } from "@/components/app-shell"
import { DashboardHeader } from "@/components/dashboard-header"
import { drillDownBackHref } from "@/lib/nav"
import { MemberPanelTabs } from "@/components/member-panel-tabs"

export default async function GestorEntregadorPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ from?: string | string[] }>
}) {
  let viewer
  try {
    viewer = await resolveViewerMode()
  } catch {
    redirect("/")
  }

  const { userId } = await params
  const fromParam = (await searchParams).from
  const backHref = drillDownBackHref(viewer.mode, typeof fromParam === "string" ? fromParam : undefined)
  const targetUserId = Number(userId)
  if (!targetUserId) notFound()

  // ADMIN MASTER: acesso de escrita a QUALQUER organização, usando a MESMA
  // UI do entregador — nunca as actions normais de entregador (essas
  // continuam restritas ao dono do registro). Ver app/actions/admin-override.ts.
  if (viewer.mode === "admin") {
    const data = await adminGetTargetMemberData(targetUserId)
    if (!data) notFound()

    return (
      <AppShell user={viewer.user}>
        <DashboardHeader
          title={data.member.name}
          subtitle={`Entregador · ${data.orgName}`}
          viewerMode={{ entregadorName: data.member.name, mode: "admin", backHref }}
        />
        <MemberPanelTabs
          panels={data.panels}
          actions={{
            onSaveDailyRecord: adminSaveDailyRecord.bind(null, data.organizationId, targetUserId),
            onDeleteDailyRecord: adminDeleteDailyRecord.bind(null, data.organizationId, targetUserId),
            onCreateDelivery: adminCreateDelivery.bind(null, data.organizationId, targetUserId),
            onUpdateDelivery: adminUpdateDelivery.bind(null, data.organizationId, targetUserId),
            onUpdateDeliveryStatus: adminUpdateDeliveryStatus.bind(null, data.organizationId, targetUserId),
            onDeleteDelivery: adminDeleteDelivery.bind(null, data.organizationId, targetUserId),
            onCreateTransaction: adminCreateTransaction.bind(null, data.organizationId, targetUserId),
            onUpdateTransaction: adminUpdateTransaction.bind(null, data.organizationId, targetUserId),
            onDeleteTransaction: adminDeleteTransaction.bind(null, data.organizationId, targetUserId),
          }}
        />
      </AppShell>
    )
  }

  // Fluxo normal do gestor: somente leitura, restrito à própria organização.
  // getMemberDashboardData já confirma que targetUserId tem membership de
  // entregador ativa na MESMA organização do gestor logado (anti-IDOR) —
  // retorna null se não pertencer, o que aqui vira 404 em vez de vazar dado.
  const data = await getMemberDashboardData(targetUserId, viewer)
  if (!data) notFound()

  return (
    <AppShell user={viewer.user}>
      <DashboardHeader
        title={data.member.name}
        subtitle="Entregador"
        viewerMode={{ entregadorName: data.member.name, backHref }}
      />
      <MemberPanelTabs panels={data.panels} />
    </AppShell>
  )
}
