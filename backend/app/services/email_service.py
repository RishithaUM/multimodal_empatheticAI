import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import os


class EmailNotificationService:
    """Email notification service"""
    
    @staticmethod
    def send_guardian_alert(recipient_emails, user_name, emotion, severity, alert_type,
                            confidence=50, intensity=50, message='', timestamp=None):
        """Send guardian alert email"""
        try:
            provider = current_app.config.get('EMAIL_SERVICE_PROVIDER', 'gmail')
            
            if provider == 'gmail':
                return EmailNotificationService._send_via_smtp(
                    recipient_emails, user_name, emotion, severity, alert_type,
                    confidence, intensity, message, timestamp
                )
            elif provider == 'sendgrid':
                return EmailNotificationService._send_via_sendgrid(
                    recipient_emails, user_name, emotion, severity, alert_type,
                    confidence, intensity, message, timestamp
                )
            elif provider == 'aws_ses':
                return EmailNotificationService._send_via_aws_ses(
                    recipient_emails, user_name, emotion, severity, alert_type,
                    confidence, intensity, message, timestamp
                )
            else:
                return {
                    'success': False,
                    'error': f'Unknown email provider: {provider}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _send_via_smtp(recipient_emails, user_name, emotion, severity, alert_type,
                       confidence=50, intensity=50, message='', timestamp=None):
        """Send email via SMTP (Gmail)"""
        try:
            sender_email = current_app.config['EMAIL_FROM_ADDRESS']
            sender_password = current_app.config['EMAIL_API_KEY']
            smtp_server = current_app.config['SMTP_SERVER']
            smtp_port = current_app.config['SMTP_PORT']
            
            subject = f"EmpathAI Guardian Alert — {emotion} detected for {user_name}"
            html_body = EmailNotificationService._create_alert_html(
                user_name, emotion, severity, alert_type, confidence, intensity, message, timestamp
            )
            plain_body = EmailNotificationService._create_alert_body(
                user_name, emotion, severity, alert_type
            )
            
            sent_count = 0
            for recipient in recipient_emails:
                try:
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = subject
                    msg['From'] = sender_email
                    msg['To'] = recipient
                    msg.attach(MIMEText(plain_body, 'plain'))
                    msg.attach(MIMEText(html_body, 'html'))
                    
                    with smtplib.SMTP(smtp_server, smtp_port) as server:
                        server.starttls()
                        server.login(sender_email, sender_password)
                        server.send_message(msg)
                    
                    sent_count += 1
                except Exception as e:
                    print(f"Failed to send email to {recipient}: {str(e)}")
            
            return {
                'success': sent_count > 0,
                'sent_count': sent_count,
                'total_recipients': len(recipient_emails)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _send_via_sendgrid(recipient_emails, user_name, emotion, severity, alert_type,
                           confidence=50, intensity=50, message='', timestamp=None):
        """Send email via SendGrid"""
        try:
            api_key = current_app.config['EMAIL_API_KEY']
            from_email = current_app.config['EMAIL_FROM_ADDRESS']
            
            url = 'https://api.sendgrid.com/v3/mail/send'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            subject = f"EmpathAI Guardian Alert — {emotion} detected for {user_name}"
            html_content = EmailNotificationService._create_alert_html(
                user_name, emotion, severity, alert_type, confidence, intensity, message, timestamp
            )
            
            for recipient in recipient_emails:
                data = {
                    'personalizations': [
                        {'to': [{'email': recipient}]}
                    ],
                    'from': {'email': from_email, 'name': 'EmpathAI Guardian System'},
                    'subject': subject,
                    'content': [
                        {'type': 'text/html', 'value': html_content}
                    ]
                }
                
                response = requests.post(url, json=data, headers=headers)
                if response.status_code not in [200, 201, 202]:
                    raise Exception(f"SendGrid error: {response.text}")
            
            return {
                'success': True,
                'sent_count': len(recipient_emails),
                'total_recipients': len(recipient_emails)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _send_via_aws_ses(recipient_emails, user_name, emotion, severity, alert_type,
                          confidence=50, intensity=50, message='', timestamp=None):
        """Send email via AWS SES"""
        try:
            # Requires boto3 and AWS credentials
            import boto3
            
            client = boto3.client('ses')
            sender_email = current_app.config['EMAIL_FROM_ADDRESS']
            
            subject = f"EmpathAI Guardian Alert — {emotion} detected for {user_name}"
            html_content = EmailNotificationService._create_alert_html(
                user_name, emotion, severity, alert_type, confidence, intensity, message, timestamp
            )
            
            response = client.send_email(
                Source=sender_email,
                Destination={'ToAddresses': recipient_emails},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {'Html': {'Data': html_content}}
                }
            )
            
            return {
                'success': True,
                'message_id': response['MessageId'],
                'sent_count': len(recipient_emails)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _create_alert_body(user_name, emotion, severity, alert_type):
        """Create plain text alert body"""
        return f"""
Dear Guardian,

We detected a potential emotional distress situation for {user_name}.

Alert Details:
- Detected Emotion: {emotion}
- Severity: {severity}
- Alert Type: {alert_type}
- Timestamp: {EmailNotificationService._get_timestamp()}

Please check on {user_name} to ensure they are okay.

Best regards,
EmpathAI Team
        """
    
    @staticmethod
    def _create_alert_html(user_name, emotion, severity, alert_type,
                           confidence=50, intensity=50, message='', timestamp=None):
        """Create branded HTML alert email"""
        from datetime import datetime
        from zoneinfo import ZoneInfo
        is_critical = severity == 'critical'
        accent_color = '#EF4444' if is_critical else '#F59E0B'
        accent_light = '#FEF2F2' if is_critical else '#FFFBEB'
        badge_text = 'CRITICAL ALERT' if is_critical else 'WARNING'
        trigger_label = alert_type.replace('_', ' ')
        ts = timestamp / 1000 if timestamp and timestamp > 1e10 else (timestamp or datetime.utcnow().timestamp())
        dt_ist = datetime.fromtimestamp(ts, tz=ZoneInfo('Asia/Kolkata'))
        date_str = dt_ist.strftime('%d %b %Y, %I:%M %p IST')
        year = dt_ist.year
        emotion_emoji = {
            'Sad': '\U0001f622', 'Anxious': '\U0001f630', 'Angry': '\U0001f620',
            'Fearful': '\U0001f628', 'Disgusted': '\U0001f922', 'Distressed': '\U0001f623',
            'Happy': '\U0001f60a', 'Neutral': '\U0001f610', 'Surprised': '\U0001f632',
        }
        emoji = emotion_emoji.get(emotion, '\U0001f514')
        alert_message = message or f'{emotion} detected. Please check on {user_name}.'
        conf_int = int(confidence)
        intens_int = int(intensity)
        actions = [
            "Reach out to the user and check in on how they're feeling",
            'Review their recent emotion history in the EmpathAI dashboard',
            'Consider scheduling a conversation or wellness check',
        ]
        actions_html = ''.join([
            f'<tr><td style="padding:6px 0;">'
            f'<table cellpadding="0" cellspacing="0"><tr>'
            f'<td style="width:24px;height:24px;background:#00D4AA18;border-radius:50%;text-align:center;'
            f'vertical-align:middle;font-size:11px;font-weight:700;color:#00D4AA;">{i+1}</td>'
            f'<td style="padding-left:10px;font-size:13px;color:#374151;line-height:1.5;">{a}</td>'
            f'</tr></table></td></tr>'
            for i, a in enumerate(actions)
        ])
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EmpathAI Guardian Alert</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0D0D14 0%,#1C1C2E 100%);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Empath<span style="color:#00D4AA;">AI</span></p>
                <p style="margin:4px 0 0;font-size:12px;color:#6B7280;letter-spacing:0.5px;text-transform:uppercase;">Emotional Intelligence Platform</p>
              </td>
              <td align="right">
                <span style="display:inline-block;background:{accent_color};color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:100px;text-transform:uppercase;">{badge_text}</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:{accent_light};border-left:4px solid {accent_color};padding:16px 32px;">
            <p style="margin:0;font-size:13px;font-weight:600;color:{accent_color};text-transform:uppercase;letter-spacing:0.5px;">{trigger_label}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Detected on {date_str}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Hello,<br/>EmpathAI has detected an emotional pattern that may require your attention for <strong style="color:#111827;">{user_name}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Detected Emotion</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#111827;">{emoji} {emotion}</p>
                  </td>
                  <td align="right" valign="top">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="text-align:center;padding:0 12px;">
                        <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">{conf_int}%</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Confidence</p>
                      </td>
                      <td style="width:1px;background:#E5E7EB;"></td>
                      <td style="text-align:center;padding:0 12px;">
                        <p style="margin:0;font-size:22px;font-weight:800;color:{accent_color};">{intens_int}%</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Intensity</p>
                      </td>
                    </tr></table>
                  </td>
                </tr></table>
                <div style="margin-top:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:11px;color:#9CA3AF;">Intensity Level</td>
                    <td align="right" style="font-size:11px;color:#9CA3AF;">{intens_int}/100</td>
                  </tr></table>
                  <div style="margin-top:6px;background:#E5E7EB;border-radius:100px;height:6px;overflow:hidden;">
                    <div style="width:{intens_int}%;background:{accent_color};height:6px;border-radius:100px;"></div>
                  </div>
                </div>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#1D4ED8;margin-bottom:6px;">What this means</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">{alert_message}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">Recommended Actions</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">{actions_html}</table>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;" />
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;text-align:center;">
              You are receiving this alert because you are listed as a guardian in EmpathAI.<br/>
              To manage your notification preferences, visit the Settings page.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:11px;color:#9CA3AF;">&copy; {year} EmpathAI &middot; Emotional Intelligence Platform</td>
              <td align="right" style="font-size:11px;color:#9CA3AF;">Powered by EmpathAI</td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    
    @staticmethod
    def _get_timestamp():
        """Get current timestamp as string"""
        from datetime import datetime
        return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
