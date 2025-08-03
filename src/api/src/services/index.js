const AuthService = require('./auth.service');
const MemberService = require('./member.service');
const OllamaService = require('./ollama.service');
const NotificationService = require('./notification.service');
const TagService = require('./tag.service');
const ImageStorageService = require('./imageStorage.service');
const PropertyService = require('./property.service');
const ChecklistService = require('./checklist.service');
const VideoAnalysisService = require('./videoAnalysis.service');
const ChatService = require('./chat.service');
const AuditService = require('./audit.service');
const SOPService = require('./sop.service');

module.exports = {
  AuthService,
  MemberService,
  OllamaService,
  NotificationService,
  TagService,
  ImageStorageService,
  PropertyService,
  ChecklistService,
  VideoAnalysisService,
  ChatService,
  AuditService,
  SOPService
};
