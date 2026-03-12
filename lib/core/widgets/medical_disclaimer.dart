import 'package:flutter/material.dart';
import 'package:mystasis/core/theme/theme.dart';

/// Reusable medical disclaimer for AI-generated content.
/// Required on every widget that displays LLM output.
class MedicalDisclaimer extends StatelessWidget {
  const MedicalDisclaimer({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.info_outline, size: 14, color: MystasisTheme.neutralGrey),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'This is AI-generated content, not a medical diagnosis. '
            'Discuss these findings with your healthcare provider.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: MystasisTheme.neutralGrey,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      ],
    );
  }
}
