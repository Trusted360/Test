/**
 * Simple SOP Service - mirrors checklist pattern exactly
 * Direct database operations without complex business logic
 */

class SOPService {
  constructor(sopModel) {
    this.sopModel = sopModel;
  }

  // ===== SOP Templates =====

  /**
   * Get all SOP templates
   */
  async getSOPTemplates(tenantId, filters = {}) {
    return await this.sopModel.getSOPTemplates(tenantId, filters);
  }

  /**
   * Get SOP template by ID
   */
  async getSOPTemplateById(id, tenantId) {
    return await this.sopModel.getSOPTemplateById(id, tenantId);
  }

  /**
   * Create new SOP template
   */
  async createSOPTemplate(templateData, tenantId, userId) {
    return await this.sopModel.createSOPTemplate(templateData, tenantId, userId);
  }

  /**
   * Update SOP template
   */
  async updateSOPTemplate(id, templateData, tenantId) {
    return await this.sopModel.updateSOPTemplate(id, templateData, tenantId);
  }

  /**
   * Delete SOP template
   */
  async deleteSOPTemplate(id, tenantId) {
    return await this.sopModel.deleteSOPTemplate(id, tenantId);
  }

  // ===== SOP Items =====

  /**
   * Add item to SOP template
   */
  async addSOPItem(templateId, itemData) {
    return await this.sopModel.addSOPItem(templateId, itemData);
  }

  /**
   * Update SOP item
   */
  async updateSOPItem(id, itemData) {
    return await this.sopModel.updateSOPItem(id, itemData);
  }

  /**
   * Delete SOP item
   */
  async deleteSOPItem(id) {
    return await this.sopModel.deleteSOPItem(id);
  }

  // ===== Property SOPs =====

  /**
   * Get SOPs for a property
   */
  async getPropertySOPs(propertyId, filters = {}) {
    return await this.sopModel.getPropertySOPs(propertyId, filters);
  }

  /**
   * Create property SOP assignment
   */
  async createPropertySOP(propertyId, templateId, assignedTo, dueDate = null) {
    return await this.sopModel.createPropertySOP(propertyId, templateId, assignedTo, dueDate);
  }

  /**
   * Get property SOP by ID
   */
  async getPropertySOPById(id) {
    return await this.sopModel.getPropertySOPById(id);
  }

  /**
   * Update property SOP
   */
  async updatePropertySOP(id, updateData) {
    return await this.sopModel.updatePropertySOP(id, updateData);
  }

  // ===== SOP Responses =====

  /**
   * Save SOP item response
   */
  async saveSOPResponse(sopId, itemId, responseData, userId) {
    return await this.sopModel.saveSOPResponse(sopId, itemId, responseData, userId);
  }

  /**
   * Update SOP item response
   */
  async updateSOPResponse(responseId, responseData) {
    return await this.sopModel.updateSOPResponse(responseId, responseData);
  }

  // ===== Compatibility methods for existing frontend =====

  /**
   * Get SOPs (compatibility method)
   */
  async getSops(tenantId, filters = {}) {
    return await this.getSOPTemplates(tenantId, filters);
  }

  /**
   * Create SOP (compatibility method)
   */
  async createSop(sopData, tenantId, userId) {
    return await this.createSOPTemplate(sopData, tenantId, userId);
  }

  /**
   * Get SOP by ID (compatibility method)
   */
  async getSopById(id, tenantId) {
    return await this.getSOPTemplateById(id, tenantId);
  }

  /**
   * Update SOP (compatibility method)
   */
  async updateSop(id, sopData, tenantId) {
    return await this.updateSOPTemplate(id, sopData, tenantId);
  }

  /**
   * Delete SOP (compatibility method)
   */
  async deleteSop(id, tenantId) {
    return await this.deleteSOPTemplate(id, tenantId);
  }
}

module.exports = SOPService;