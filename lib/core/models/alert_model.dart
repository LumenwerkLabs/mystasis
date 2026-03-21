import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';
import 'package:mystasis/core/models/biomarker_model.dart';

/// Alert status matching backend AlertStatus enum.
enum AlertStatus {
  active,
  acknowledged,
  resolved,
  dismissed;

  String get apiValue => name.toUpperCase();

  String get displayName {
    switch (this) {
      case AlertStatus.active:
        return 'Active';
      case AlertStatus.acknowledged:
        return 'Acknowledged';
      case AlertStatus.resolved:
        return 'Resolved';
      case AlertStatus.dismissed:
        return 'Dismissed';
    }
  }

  static AlertStatus fromApi(String value) {
    switch (value.toUpperCase()) {
      case 'ACTIVE':
        return AlertStatus.active;
      case 'ACKNOWLEDGED':
        return AlertStatus.acknowledged;
      case 'RESOLVED':
        return AlertStatus.resolved;
      case 'DISMISSED':
        return AlertStatus.dismissed;
      default:
        return AlertStatus.active;
    }
  }
}

/// Alert severity matching backend AlertSeverity enum.
enum AlertSeverity {
  low,
  medium,
  high,
  critical;

  String get apiValue => name.toUpperCase();

  String get displayName {
    switch (this) {
      case AlertSeverity.low:
        return 'Low';
      case AlertSeverity.medium:
        return 'Medium';
      case AlertSeverity.high:
        return 'High';
      case AlertSeverity.critical:
        return 'Critical';
    }
  }

  Color get color {
    switch (this) {
      case AlertSeverity.low:
        return MystasisTheme.neutralGrey;
      case AlertSeverity.medium:
        return MystasisTheme.signalAmber;
      case AlertSeverity.high:
        return MystasisTheme.errorRed;
      case AlertSeverity.critical:
        return MystasisTheme.errorRed;
    }
  }

  static AlertSeverity fromApi(String value) {
    switch (value.toUpperCase()) {
      case 'LOW':
        return AlertSeverity.low;
      case 'MEDIUM':
        return AlertSeverity.medium;
      case 'HIGH':
        return AlertSeverity.high;
      case 'CRITICAL':
        return AlertSeverity.critical;
      default:
        return AlertSeverity.low;
    }
  }
}

/// Alert model matching the backend Alert entity.
class AlertModel {
  final String id;
  final String userId;
  final String type;
  final AlertSeverity severity;
  final AlertStatus status;
  final String title;
  final String message;
  final double? value;
  final double? threshold;
  final DateTime createdAt;
  final DateTime updatedAt;

  const AlertModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.severity,
    required this.status,
    required this.title,
    required this.message,
    this.value,
    this.threshold,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      type: json['type'] as String,
      severity: AlertSeverity.fromApi(json['severity'] as String),
      status: AlertStatus.fromApi(json['status'] as String),
      title: json['title'] as String,
      message: json['message'] as String,
      value: json['value'] != null ? (json['value'] as num).toDouble() : null,
      threshold: json['threshold'] != null
          ? (json['threshold'] as num).toDouble()
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'type': type,
      'severity': severity.apiValue,
      'status': status.apiValue,
      'title': title,
      'message': message,
      'value': value,
      'threshold': threshold,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  AlertModel copyWith({
    String? id,
    String? userId,
    String? type,
    AlertSeverity? severity,
    AlertStatus? status,
    String? title,
    String? message,
    double? value,
    double? threshold,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return AlertModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      type: type ?? this.type,
      severity: severity ?? this.severity,
      status: status ?? this.status,
      title: title ?? this.title,
      message: message ?? this.message,
      value: value ?? this.value,
      threshold: threshold ?? this.threshold,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Human-readable display name for the biomarker type that triggered this alert.
  String get biomarkerDisplayName =>
      BiomarkerModel.displayNameFor(type) ?? type;

  /// Whether this alert can be acted upon (acknowledge/dismiss/resolve).
  bool get isActionable =>
      status == AlertStatus.active || status == AlertStatus.acknowledged;
}
