import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import os


class EmailNotificationService:
    """Email notification service"""
    
    @staticmethod
    def send_guardian_alert(recipient_emails, user_name, emotion, severity, alert_type):
        """Send guardian alert email"""
        try:
            provider = current_app.config.get('EMAIL_SERVICE_PROVIDER', 'gmail')
            
            if provider == 'gmail':
                return EmailNotificationService._send_via_smtp(
                    recipient_emails, user_name, emotion, severity, alert_type
                )
            elif provider == 'sendgrid':
                return EmailNotificationService._send_via_sendgrid(
                    recipient_emails, user_name, emotion, severity, alert_type
                )
            elif provider == 'aws_ses':
                return EmailNotificationService._send_via_aws_ses(
                    recipient_emails, user_name, emotion, severity, alert_type
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
    def _send_via_smtp(recipient_emails, user_name, emotion, severity, alert_type):
        """Send email via SMTP (Gmail)"""
        try:
            sender_email = current_app.config['EMAIL_FROM_ADDRESS']
            sender_password = current_app.config['EMAIL_API_KEY']
            smtp_server = current_app.config['SMTP_SERVER']
            smtp_port = current_app.config['SMTP_PORT']
            
            # Create email message
            subject = f"[{severity.upper()}] Alert for {user_name} - Emotion: {emotion}"
            body = EmailNotificationService._create_alert_body(
                user_name, emotion, severity, alert_type
            )
            
            # Send to each recipient
            sent_count = 0
            for recipient in recipient_emails:
                try:
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = subject
                    msg['From'] = sender_email
                    msg['To'] = recipient
                    
                    # Attach HTML version
                    html_body = EmailNotificationService._create_alert_html(
                        user_name, emotion, severity, alert_type
                    )
                    msg.attach(MIMEText(body, 'plain'))
                    msg.attach(MIMEText(html_body, 'html'))
                    
                    # Send email
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
    def _send_via_sendgrid(recipient_emails, user_name, emotion, severity, alert_type):
        """Send email via SendGrid"""
        try:
            api_key = current_app.config['EMAIL_API_KEY']
            from_email = current_app.config['EMAIL_FROM_ADDRESS']
            
            url = 'https://api.sendgrid.com/v3/mail/send'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            subject = f"[{severity.upper()}] Alert for {user_name} - Emotion: {emotion}"
            html_content = EmailNotificationService._create_alert_html(
                user_name, emotion, severity, alert_type
            )
            
            for recipient in recipient_emails:
                data = {
                    'personalizations': [
                        {'to': [{'email': recipient}]}
                    ],
                    'from': {'email': from_email},
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
    def _send_via_aws_ses(recipient_emails, user_name, emotion, severity, alert_type):
        """Send email via AWS SES"""
        try:
            # Requires boto3 and AWS credentials
            import boto3
            
            client = boto3.client('ses')
            sender_email = current_app.config['EMAIL_FROM_ADDRESS']
            
            subject = f"[{severity.upper()}] Alert for {user_name} - Emotion: {emotion}"
            html_content = EmailNotificationService._create_alert_html(
                user_name, emotion, severity, alert_type
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
    def _create_alert_html(user_name, emotion, severity, alert_type):
        """Create HTML alert email"""
        severity_color = '#ff6b6b' if severity == 'critical' else '#ffd43b'
        
        return f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: {severity_color}; color: white; padding: 20px; border-radius: 5px; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; margin: 10px 0; border-radius: 5px; }}
                    .alert-type {{ font-weight: bold; font-size: 16px; }}
                    .emotion {{ color: {severity_color}; font-size: 24px; font-weight: bold; }}
                    .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>⚠️ {severity.upper()} ALERT</h2>
                    </div>
                    <div class="content">
                        <p>Dear Guardian,</p>
                        <p>We detected a potential emotional distress situation for <strong>{user_name}</strong>.</p>
                        
                        <h3>Alert Details:</h3>
                        <ul>
                            <li><strong>Detected Emotion:</strong> <span class="emotion">{emotion}</span></li>
                            <li><strong>Severity:</strong> {severity}</li>
                            <li><strong>Alert Type:</strong> <span class="alert-type">{alert_type}</span></li>
                            <li><strong>Timestamp:</strong> {EmailNotificationService._get_timestamp()}</li>
                        </ul>
                        
                        <p>Please check on {user_name} to ensure they are okay. You can log in to the platform to view more details.</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 EmpathAI - Emotion Detection System</p>
                    </div>
                </div>
            </body>
        </html>
        """
    
    @staticmethod
    def _get_timestamp():
        """Get current timestamp as string"""
        from datetime import datetime
        return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
