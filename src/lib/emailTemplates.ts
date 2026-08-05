import { LeaveRequest, EmailSettings } from '../types';

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  smtpHost: 'smtp.bitmesra.ac.in',
  smtpPort: 587,
  smtpUsername: 'leave-portal@bitmesra.ac.in',
  senderEmail: 'leave-portal@bitmesra.ac.in',
  senderName: 'BIT Leave Portal System',
  encryption: 'TLS',
  sendCopyAdmin: true,
  adminCcEmail: 'admin.leave@bitmesra.ac.in'
};

const getBaseEmailHtml = (title: string, subtitle: string, contentHtml: string, institutionName: string = 'BIT Leave Portal') => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .email-header { background-color: #3F51B5; color: #ffffff; padding: 24px 28px; text-align: left; }
    .email-header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .email-header p { margin: 4px 0 0 0; font-size: 12px; color: #e0e7ff; opacity: 0.9; }
    .email-body { padding: 28px; }
    .info-card { background-color: #f1f5f9; border-left: 4px solid #3F51B5; padding: 16px 20px; border-radius: 6px; margin: 20px 0; }
    .info-grid { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .info-grid td { padding: 6px 0; font-size: 13px; }
    .info-grid td.label { font-weight: 600; color: #64748b; width: 38%; }
    .info-grid td.value { color: #0f172a; font-weight: 500; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-pending { background-color: #fef3c7; color: #92400e; }
    .badge-approved { background-color: #d1fae5; color: #065f46; }
    .badge-rejected { background-color: #fee2e2; color: #991b1b; }
    .cta-button { display: inline-block; background-color: #3F51B5; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 24px; }
    .email-footer { background-color: #f8fafc; padding: 18px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>${institutionName}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="email-body">
      ${contentHtml}
      <div style="text-align: center;">
        <a href="https://ai.studio/build" class="cta-button">Open Leave Portal</a>
      </div>
    </div>
    <div class="email-footer">
      <p>This is an automated system notification from ${institutionName}. Please do not reply directly to this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${institutionName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * 1. Email to Department HoD when staff applies for leave
 */
export const buildLeaveSubmittedEmail = (req: LeaveRequest, hodName: string, institutionName: string) => {
  const subject = `[Action Required] New Leave Application #${req.id} - ${req.applicantName} (${req.leaveType})`;
  const contentHtml = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Dear Prof. / Dr. ${hodName},</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      A new leave application has been submitted by <strong>${req.applicantName}</strong> (${req.applicantDesignation}, ${req.departmentName}) requiring your HoD review and endorsement.
    </p>

    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #475569;">APPLICATION DETAILS</span>
        <span class="badge badge-pending">PENDING HOD ENDORSEMENT</span>
      </div>
      <table class="info-grid">
        <tr>
          <td class="label">Application ID:</td>
          <td class="value"><strong>${req.id}</strong></td>
        </tr>
        <tr>
          <td class="label">Staff Member:</td>
          <td class="value">${req.applicantName} (${req.applicantEmail})</td>
        </tr>
        <tr>
          <td class="label">Leave Type:</td>
          <td class="value"><strong>${req.leaveType}</strong></td>
        </tr>
        <tr>
          <td class="label">Duration:</td>
          <td class="value">${req.startDate} to ${req.endDate} (${req.totalDays} day${req.totalDays > 1 ? 's' : ''})</td>
        </tr>
        <tr>
          <td class="label">Reason / Purpose:</td>
          <td class="value">${req.reason}</td>
        </tr>
        ${req.contactPhone ? `
        <tr>
          <td class="label">Emergency Contact:</td>
          <td class="value">${req.contactPhone}</td>
        </tr>` : ''}
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">
      Please log in to the BIT Leave Portal to endorse and forward this application to the Registrar's Office or decline with comments.
    </p>
  `;

  const bodyText = `Dear ${hodName},\n\nNew leave application #${req.id} submitted by ${req.applicantName} (${req.applicantDesignation}, ${req.departmentName}).\nLeave Type: ${req.leaveType}\nDuration: ${req.startDate} to ${req.endDate} (${req.totalDays} days)\nReason: ${req.reason}\n\nPlease review on the Leave Portal.`;

  return {
    subject,
    bodyHtml: getBaseEmailHtml(subject, 'Department HoD Action Required', contentHtml, institutionName),
    bodyText
  };
};

/**
 * 2a. Email to Registrar when HoD endorses leave
 */
export const buildHodRecommendedEmail = (req: LeaveRequest, registrarName: string, hodComments: string, institutionName: string) => {
  const subject = `[For Sanction] Endorsed Leave Application #${req.id} - ${req.applicantName} (${req.departmentName})`;
  const contentHtml = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Respected ${registrarName},</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Leave application <strong>#${req.id}</strong> for <strong>${req.applicantName}</strong> (${req.departmentName}) has been officially <strong>endorsed and recommended by Head of Department</strong> and is now pending your final sanction.
    </p>

    <div class="info-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #475569;">HOD RECOMMENDED</span>
        <span class="badge badge-pending">PENDING REGISTRAR SANCTION</span>
      </div>
      <table class="info-grid">
        <tr>
          <td class="label">Application ID:</td>
          <td class="value"><strong>${req.id}</strong></td>
        </tr>
        <tr>
          <td class="label">Applicant Name:</td>
          <td class="value">${req.applicantName} (${req.applicantDesignation})</td>
        </tr>
        <tr>
          <td class="label">Department:</td>
          <td class="value">${req.departmentName}</td>
        </tr>
        <tr>
          <td class="label">Leave Category:</td>
          <td class="value"><strong>${req.leaveType}</strong> (${req.totalDays} day${req.totalDays > 1 ? 's' : ''})</td>
        </tr>
        <tr>
          <td class="label">Period:</td>
          <td class="value">${req.startDate} to ${req.endDate}</td>
        </tr>
        <tr>
          <td class="label">HoD Endorsement Note:</td>
          <td class="value"><em>"${hodComments || 'Recommended for sanction.'}"</em></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">
      Kindly review and issue the final sanction order on the portal.
    </p>
  `;

  const bodyText = `Respected ${registrarName},\n\nLeave application #${req.id} for ${req.applicantName} has been recommended by HoD (${hodComments}). Pending your final sanction.\n\nPlease log in to the portal to sanction.`;

  return {
    subject,
    bodyHtml: getBaseEmailHtml(subject, 'Pending Registrar Sanction Order', contentHtml, institutionName),
    bodyText
  };
};

/**
 * 2b. Email to Staff Member when HoD rejects
 */
export const buildHodRejectedEmail = (req: LeaveRequest, hodComments: string, institutionName: string) => {
  const subject = `[Update] Leave Application #${req.id} - Declined by HoD`;
  const contentHtml = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Dear ${req.applicantName},</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Your leave application <strong>#${req.id}</strong> for ${req.leaveType} (${req.startDate} to ${req.endDate}) has been <strong>declined</strong> by your Department Head.
    </p>

    <div class="info-card" style="border-left-color: #ef4444;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #991b1b;">STATUS UPDATE</span>
        <span class="badge badge-rejected">REJECTED BY HOD</span>
      </div>
      <table class="info-grid">
        <tr>
          <td class="label">Application ID:</td>
          <td class="value"><strong>${req.id}</strong></td>
        </tr>
        <tr>
          <td class="label">Leave Type:</td>
          <td class="value">${req.leaveType} (${req.totalDays} day${req.totalDays > 1 ? 's' : ''})</td>
        </tr>
        <tr>
          <td class="label">HoD Remarks:</td>
          <td class="value" style="color: #991b1b;"><strong>"${hodComments || 'Request not approved.'}"</strong></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">
      Your leave balance pending reserve has been released back to your balance. Please contact your Department Head if you require further discussion.
    </p>
  `;

  const bodyText = `Dear ${req.applicantName},\n\nYour leave application #${req.id} was declined by HoD. Remarks: "${hodComments}". Your pending balance reserve has been released.`;

  return {
    subject,
    bodyHtml: getBaseEmailHtml(subject, 'Application Status Update', contentHtml, institutionName),
    bodyText
  };
};

/**
 * 3a. Email to Staff Member when Registrar Sanctions leave
 */
export const buildRegistrarSanctionedEmail = (req: LeaveRequest, registrarComments: string, institutionName: string) => {
  const subject = `[Sanction Granted 🎉] Leave Application #${req.id} Approved`;
  const contentHtml = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Dear ${req.applicantName},</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      We are pleased to inform you that your leave application <strong>#${req.id}</strong> has been <strong>officially sanctioned and approved</strong> by the Registrar's Office.
    </p>

    <div class="info-card" style="border-left-color: #10b981;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #065f46;">OFFICIAL SANCTION ORDER</span>
        <span class="badge badge-approved">OFFICIALLY APPROVED</span>
      </div>
      <table class="info-grid">
        <tr>
          <td class="label">Application ID:</td>
          <td class="value"><strong>${req.id}</strong></td>
        </tr>
        <tr>
          <td class="label">Leave Category:</td>
          <td class="value"><strong>${req.leaveType}</strong></td>
        </tr>
        <tr>
          <td class="label">Approved Period:</td>
          <td class="value"><strong>${req.startDate} to ${req.endDate}</strong> (${req.totalDays} day${req.totalDays > 1 ? 's' : ''})</td>
        </tr>
        <tr>
          <td class="label">Sanction Order Remarks:</td>
          <td class="value"><em>"${registrarComments || 'Sanctioned as per institutional guidelines.'}"</em></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">
      Your leave records and balance ledger have been updated automatically in the BIT Leave Portal.
    </p>
  `;

  const bodyText = `Dear ${req.applicantName},\n\nYour leave application #${req.id} (${req.leaveType}, ${req.startDate} to ${req.endDate}) has been officially sanctioned and approved by the Registrar. Remarks: "${registrarComments}".`;

  return {
    subject,
    bodyHtml: getBaseEmailHtml(subject, 'Official Sanction Order Granted', contentHtml, institutionName),
    bodyText
  };
};

/**
 * 3b. Email to Staff Member when Registrar rejects
 */
export const buildRegistrarRejectedEmail = (req: LeaveRequest, registrarComments: string, institutionName: string) => {
  const subject = `[Update] Leave Application #${req.id} - Sanction Declined`;
  const contentHtml = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Dear ${req.applicantName},</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Regrettably, your leave application <strong>#${req.id}</strong> for ${req.leaveType} (${req.startDate} to ${req.endDate}) was <strong>not sanctioned</strong> by the Registrar's Office.
    </p>

    <div class="info-card" style="border-left-color: #ef4444;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #991b1b;">REGISTRAR DECISION</span>
        <span class="badge badge-rejected">SANCTION DECLINED</span>
      </div>
      <table class="info-grid">
        <tr>
          <td class="label">Application ID:</td>
          <td class="value"><strong>${req.id}</strong></td>
        </tr>
        <tr>
          <td class="label">Registrar Remarks:</td>
          <td class="value" style="color: #991b1b;"><strong>"${registrarComments || 'Sanction not granted.'}"</strong></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #475569;">
      The reserved leave quota has been released back to your available balance.
    </p>
  `;

  const bodyText = `Dear ${req.applicantName},\n\nYour leave application #${req.id} was not sanctioned by the Registrar. Remarks: "${registrarComments}".`;

  return {
    subject,
    bodyHtml: getBaseEmailHtml(subject, 'Application Sanction Status', contentHtml, institutionName),
    bodyText
  };
};

/**
 * Test Email Template
 */
export const buildTestEmail = (targetEmail: string, targetName: string, settings: EmailSettings, institutionName: string) => {
  const subject = `[Test Email] BIT Leave Portal SMTP Configuration Check`;
  const contentHtml = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Hello ${targetName},</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      This is a test notification confirming that the <strong>${institutionName}</strong> Email Dispatch System is active and configured correctly.
    </p>

    <div class="info-card" style="border-left-color: #10b981;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #065f46;">SMTP CONFIGURATION DETAILS</span>
        <span class="badge badge-approved">VERIFIED ACTIVE</span>
      </div>
      <table class="info-grid">
        <tr>
          <td class="label">SMTP Server:</td>
          <td class="value"><strong>${settings.smtpHost}:${settings.smtpPort}</strong> (${settings.encryption})</td>
        </tr>
        <tr>
          <td class="label">Sender Identity:</td>
          <td class="value">${settings.senderName} &lt;${settings.senderEmail}&gt;</td>
        </tr>
        <tr>
          <td class="label">Target Recipient:</td>
          <td class="value">${targetEmail}</td>
        </tr>
        <tr>
          <td class="label">Timestamp:</td>
          <td class="value">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>
  `;

  const bodyText = `Hello ${targetName},\n\nThis is a test email confirming that the ${institutionName} SMTP email dispatch system is operational.`;

  return {
    subject,
    bodyHtml: getBaseEmailHtml(subject, 'SMTP Gateway Test Dispatch', contentHtml, institutionName),
    bodyText
  };
};
