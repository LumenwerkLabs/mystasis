import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mystasis/providers/auth_provider.dart';

class ClinicianSidebar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onItemSelected;

  const ClinicianSidebar({
    super.key,
    required this.selectedIndex,
    required this.onItemSelected,
  });

  static const double width = 240;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF2E7F7F), // deepBioTeal
            Color(0xFF4A9E9E), // lighter teal
            Color(0xFFA3C3D3), // cellularBlue - soft end
          ],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            // Logo
            _buildLogo(),
            const SizedBox(height: 48),
            // Navigation items
            Expanded(child: _buildNavItems()),
            // Bottom section (logout, etc.)
            _buildBottomSection(context),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Icon(Icons.biotech_outlined, color: Colors.white, size: 32),
          SizedBox(width: 12),
          Text(
            'mystasis',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItems() {
    final items = [
      _NavItem(
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard,
        label: 'Overview',
      ),
      _NavItem(
        icon: Icons.science_outlined,
        activeIcon: Icons.science,
        label: 'Biomarkers',
      ),
      _NavItem(
        icon: Icons.watch_outlined,
        activeIcon: Icons.watch,
        label: 'Wearables',
      ),
      _NavItem(
        icon: Icons.assessment_outlined,
        activeIcon: Icons.assessment,
        label: 'Reports',
      ),
      _NavItem(
        icon: Icons.mic_outlined,
        activeIcon: Icons.mic,
        label: 'Anamnesis',
      ),
      _NavItem(
        icon: Icons.settings_outlined,
        activeIcon: Icons.settings,
        label: 'Settings',
      ),
    ];

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final isSelected = index == selectedIndex;

        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: _SidebarNavItem(
            icon: isSelected ? item.activeIcon : item.icon,
            label: item.label,
            isSelected: isSelected,
            onTap: () => onItemSelected(index),
          ),
        );
      },
    );
  }

  Widget _buildBottomSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: [
          const Divider(color: Colors.white24, height: 32),
          _SidebarNavItem(
            icon: Icons.help_outline,
            label: 'Help & Support',
            isSelected: false,
            onTap: () {},
          ),
          const SizedBox(height: 4),
          _SidebarNavItem(
            icon: Icons.logout,
            label: 'Sign Out',
            isSelected: false,
            onTap: () async {
              await context.read<AuthProvider>().signOut();
              if (context.mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              } else {
                null;
              }
            },
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

class _SidebarNavItem extends StatefulWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _SidebarNavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  State<_SidebarNavItem> createState() => _SidebarNavItemState();
}

class _SidebarNavItemState extends State<_SidebarNavItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: widget.isSelected
              ? Colors.white.withValues(alpha: 0.2)
              : _isHovered
              ? Colors.white.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: widget.onTap,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Icon(
                    widget.icon,
                    color: Colors.white.withValues(
                      alpha: widget.isSelected ? 1.0 : 0.8,
                    ),
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    widget.label,
                    style: TextStyle(
                      color: Colors.white.withValues(
                        alpha: widget.isSelected ? 1.0 : 0.8,
                      ),
                      fontSize: 15,
                      fontWeight: widget.isSelected
                          ? FontWeight.w500
                          : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
