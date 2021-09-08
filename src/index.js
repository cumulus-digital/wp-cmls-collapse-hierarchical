import './index.scss';
import jQuery from 'jquery';
import Cookies from 'js-cookie';
import { last } from 'lodash';

let $j = jQuery.noConflict();
(function ($, window, undefined) {

	// Short-circuit if we don't operate here
	const $body = $('body.wp-cmls-collapsable');
	if (!$body.length) {
		return;
	}

	const relationships = {};

	function generateRelationshipsFromDOM() {
		$('#the-list tr').each(function () {
			var $this = $(this),
				id = parseInt($this.find('input[name="post[]"],input[name="delete_tags[]"]').attr('value')),
				parent = parseInt($this.find('.post_parent,.parent').text()),
				type = this.id.substr(0, this.id.indexOf('-')),
				parentId = type + '-' + parent,
				postId = type + '-' + id,
				level = 0,
				levelMatch = this.className.match(/level\-(\d+)/);

			if (!id) {
				return;
			}

			if (levelMatch.length > 1) {
				level = parseInt(levelMatch[1]);
			}

			let newVal = {
				node: this,
				level: level,
				children: [],
				has_parent: false,
				collapsed: false,
			};

			// Check if this node was initialized earlier
			if (relationships.hasOwnProperty(postId)) {
				// if it was, grab its initialized values
				newVal = {
					node: this,
					level: level,
					children: relationships[postId].children || [],
					has_parent: relationships[postId].has_parent || false,
					collapsed: relationships[postId].collapsed || false,
				};
			}
			relationships[postId] = newVal;

			// Check if parent already exists
			if (parent) {
				relationships[postId].has_parent = true;
				if ( ! relationships.hasOwnProperty(parentId)) {
					relationships[parentId] = {
						children: [this]
					};
				} else {
					relationships[parentId].children.push(this);
				}
			}
		});
	}

	// Init collapse state from local storage state
	function initFromStorage() {
		const ls = JSON.parse(localStorage.getItem('wcc-state'));
		if (ls) {
			ls.forEach(function (val, i) {
				relationships[val] = {
					collapsed: true,
				};
			});
		}
	}

	function updateStorage() {
		const storeVal = [];
		for (let i in relationships) {
			if (relationships[i].collapsed) {
				storeVal.push(i);
			}
		}
		localStorage.setItem('wcc-state', JSON.stringify(storeVal));
	}

	function addHideClass(postId) {
		$(el).addClass('wcc-hide');
	}

	function collapse(id) {
		if (relationships[id]) {
			relationships[id].collapsed = true;
			$(relationships[id].node).addClass('wcc-collapsed');
			function hide(el) {
				$(el).addClass('wcc-hide');
				$(el).after('<tr class="wcc-stripe"/>');
				if (
					relationships[el.id] &&
					relationships[el.id].children &&
					relationships[el.id].children.length
				) {
					relationships[el.id].children.forEach(hide);
				}
			}
			if (
				relationships[id].children &&
				relationships[id].children.length
			) {
				relationships[id].children.forEach(hide);
			}
			updateStorage();
		}
	}

	function collapseAll(e) {
		e.preventDefault();
		for (let i in relationships) {
			if (
				relationships[i].children &&
				relationships[i].children.length
			) {
				collapse(i);
			}
		}
	}

	function expand(id) {
		if (relationships[id]) {
			relationships[id].collapsed = false;
			$(relationships[id].node).removeClass('wcc-collapsed');
			function show(el) {
				$(el).removeClass('wcc-hide');
				$(el).siblings('.wcc-stripe').remove();
				if (
					! relationships[el.id].collapsed &&
					relationships[el.id] &&
					relationships[el.id].children &&
					relationships[el.id].children.length
				) {
					relationships[el.id].children.forEach(show);
				}
			}
			if (
				relationships[id].children &&
				relationships[id].children.length
			) {
				relationships[id].children.forEach(show);
			}
			updateStorage();
		}
	}

	function expandAll(e) {
		e.preventDefault();
		for (let i in relationships) {
			if (
				relationships[i].children &&
				relationships[i].children.length
			) {
				expand(i);
			}
		}
	}

	function updateAllFromState() {
		for (let i in relationships) {
			if (relationships[i].collapsed) {
				collapse(i);
			}
		}
	}

	// Setup
	initFromStorage();
	generateRelationshipsFromDOM();
	updateAllFromState();

	const $expander = $('<i title="Toggle children"></i>');
	$expander.on('click.wp-cmls-collapse-hierarchical', function (e) {
		e.preventDefault();
		const $target = $(e.target).parents('tr'),
			id = $target.attr('id'),
			rel = relationships[id];
		if (rel.collapsed) {
			expand(id);
		} else {
			collapse(id);
		}
	});

	/**
	 * Header link setup
	 */
	const $headerLi = $('<li/>'),
		$headerA = $('<a href="#" />'),
		$expandAllLink = $headerA
			.clone(true)
			.text('Expand All')
			.on('click.wp-cmls-collapse-hierarchical', expandAll),
		$collapseAllLink = $headerA
			.clone(true)
			.text('Collapse All')
			.on('click.wp-cmls-collapse-hierarchical', collapseAll);

	let $subsubsub = $('.subsubsub');
	if (!$subsubsub.length) {
		$subsubsub = $('<ul class="subsubsub" style="float: right; vertical-align: middle" />').appendTo('.bulkactions');
	}
	// Add divider to any existing last li
	$subsubsub.find('li:last').append(' |').after("\n");
	$subsubsub
		.append(
			$headerLi
				.clone(true)
				.append($collapseAllLink)
				.append(' |')
		)
		.append("\n")
		.append(
			$headerLi
				.clone(true)
				.append($expandAllLink)
		)
		.append("\n");

	/**
	 * Initialize row display and actions
	 */
	for (let i in relationships) {
		let row = relationships[i],
			$row = $(row.node),
			$title = $row.find('.row-title'),
			$actions = $row.find('.row-actions');

		// Replace "—" in title
		if (row.has_parent) {
			$row.addClass('wcc-has_parent');
			$title.text(
				$title.text().replace(/— /g, '')
			);
			for (let i = 0; i < row.level; i++) {
				$title.before('<cite>•</cite>');
			}
		}

		if (row.children && row.children.length) {
			$row.addClass('wcc-has_children');
			let $actor = $expander.clone(true).attr('title', row.children.length > 1 ? 'Toggle children' : 'Toggle child');
			$title.before($actor);
			$actor.after(
				'<cite title="Item has ' +
				row.children.length +
				(row.children.length > 1 ? ' children' : ' child') +
				'.">(' +
					row.children.length +
				')</cite>'
			);
			if (row.collapsed) {
				$row.addClass('wcc-collapsed');
			}
		}

	}

}($j, window.self));