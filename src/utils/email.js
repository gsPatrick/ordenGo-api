const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const { EmailTemplate } = require('../models');

/**
 * Utilitário para envio de emails com suporte a templates dinâmicos.
 */
class Email {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Envia um email baseado em um template salvo no banco.
   * @param {string} to - Destinatário
   * @param {string} templateSlug - Slug do template (ex: 'WELCOME_USER')
   * @param {object} variables - Variáveis para substituição (ex: { name: 'João' })
   */
  async sendFromTemplate(to, templateSlug, variables = {}) {
    // 1. Buscar template no banco
    const template = await EmailTemplate.findOne({ where: { slug: templateSlug } });
    if (!template) throw new Error(`Template de email '${templateSlug}' não encontrado.`);

    // 2. Parsear conteúdo com Handlebars
    const compiledTemplate = handlebars.compile(template.htmlContent);
    const html = compiledTemplate(variables);

    // 3. Compilar assunto (também pode conter variáveis)
    const compiledSubject = handlebars.compile(template.subject);
    const subject = compiledSubject(variables);

    // 4. Enviar
    const mailOptions = {
      from: `"${process.env.BRAND_NAME || 'OrdenGO'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };

    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * Envio de email genérico (Raw)
   */
  async sendRaw(to, subject, html) {
    const mailOptions = {
      from: `"${process.env.BRAND_NAME || 'OrdenGO'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    };
    return await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new Email();
