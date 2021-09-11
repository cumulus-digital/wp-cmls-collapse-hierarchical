<?php
/*
 * Plugin Name: Collapse Hierarchical Items
 * Plugin URI: https://github.com/cumulus-digital/wp-cmls-collapse-hierarchical/
 * GitHub Plugin URI: https://github.com/cumulus-digital/wp-cmls-collapse-hierarchical/
 * Primary Branch: main
 * Description: Collapse heirarchical items (pages, categories).
 * Version: 0.0.2
 * Author: vena
 * License: UNLICENSED
 * Requires at least: 5.6
 * Requires PHP: 7.2
 */

namespace CUMULUS\Wordpress\CollapseHierarchical;

// Exit if accessed directly.
\defined( 'ABSPATH' ) || exit( 'No direct access allowed.' );

const TXTDOMAIN = 'wp-cmls-collapse-hierarchical';

\define(
	'CUMULUS\Wordpress\CollapseHierarchical\BASEPATH',
	\untrailingslashit( \plugin_dir_path( __FILE__ ) )
);
\define(
	'CUMULUS\Wordpress\CollapseHierarchical\BASEURL',
	\untrailingslashit( \plugin_dir_url( __FILE__ ) )
);

\add_action( 'admin_enqueue_scripts', function () {
	if ( ! \is_admin() ) {
		return;
	}

	$screen = \get_current_screen();

	if (
		! $screen
		|| $screen->is_block_editor
		|| ! \in_array( $screen->base, ['edit', 'edit-tags'] )
	) {
		return;
	}

	$is_hierarchical = false;
	$view_type = null;

	if ( $screen->base === 'edit' ) {
		$view_type = 'post';
		$is_hierarchical = \is_post_type_hierarchical( $screen->post_type );
	}

	if ( $screen->base === 'edit-tags' ) {
		$view_type = 'tax';
		$is_hierarchical = \is_taxonomy_hierarchical( $screen->taxonomy );
	}

	if ( $is_hierarchical ) {
		\add_filter( 'admin_body_class', function ( $classes ) use ( $view_type ) {
			if ( \mb_strstr( $classes, 'wp-cmls-collapsable' ) === false ) {
				$classes .= " wp-cmls-collapsable wp-cmls-collapsable-{$view_type}";
			}

			return $classes;
		} );

		$assets = include \CUMULUS\Wordpress\CollapseHierarchical\BASEPATH . '/build/index.asset.php';

		\wp_enqueue_script(
			TXTDOMAIN . '-backend-script',
			\CUMULUS\Wordpress\CollapseHierarchical\BASEURL . '/build/index.js',
			$assets['dependencies'],
			$assets['version'],
			true
		);

		\wp_enqueue_style(
			TXTDOMAIN . '-backend-style',
			\CUMULUS\Wordpress\CollapseHierarchical\BASEURL . '/build/index.css',
			[],
			$assets['version'],
			'screen'
		);
	}
} );
