import IntersectionObserver from 'intersection-observer';
import jQuery from 'jquery';
import Tooltip from 'tooltip.js';
import { Foundation } from 'foundation-sites/js/foundation.core';
import { Magellan } from 'foundation-sites/js/foundation.magellan';
import { Toggler } from 'foundation-sites/js/foundation.toggler';
import scrollama from 'scrollama';
import CountUp from 'countup.js';
import Rellax from 'rellax';
import objectFitImages from 'object-fit-images';
import debounce from './debounce';

window.$ = window.jQuery = jQuery;

Foundation.addToJquery($);
Foundation.plugin(Magellan, 'Magellan');
Foundation.plugin(Toggler, 'Toggler');

(function($, window, document) {
	const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

	let activeNavIndex = 0;
	let isOpen = false;
	let mobileScreenWidth = $(window).width();
	let desktopScreenWidth = $(window).width();
	let rellax = null;
	let scrollerCenter;
	let scrollerEnter;
	const $mainNav = $('.main-nav');
	const mainNavOverlay = $('.main-nav__overlay')[0];
	const $mainNavGrid = $('.main-nav__grid');
	const $mainNavCells = $('.main-nav__cell');
	const $mainNavLinks = $('.main-nav__link');
	const $mainNavTrigger = $('.main-nav__list, .main-nav__fab');
	const $mainNavClose = $('.main-nav__close');
	const $book = $('.benefits__book-image');
	const $body = $('body');
	const $scrollTargets = $('[data-magellan-target]');
	const maxNavItems = $mainNavCells.length;

	const pointerEvents = () => {
		let start = {};
		let end = {};
		let tracking = false;
		let thresholdTime = 1500;
		let thresholdDistance = 50;

		return {
			init() {
				mainNavOverlay.addEventListener('pointerdown', this.gestureStart, false);
				mainNavOverlay.addEventListener('pointermove', this.gestureMove, false);
				mainNavOverlay.addEventListener('pointerup', this.gestureEnd, false);
				mainNavOverlay.addEventListener('pointerleave', this.gestureEnd, false);
				mainNavOverlay.addEventListener('pointercancel', this.gestureEnd, false);
			},
			destroy() {
				mainNavOverlay.removeEventListener('pointerdown', this.gestureStart, false);
				mainNavOverlay.removeEventListener('pointermove', this.gestureMove, false);
				mainNavOverlay.removeEventListener('pointerup', this.gestureEnd, false);
				mainNavOverlay.removeEventListener('pointerleave', this.gestureEnd, false);
				mainNavOverlay.removeEventListener('pointercancel', this.gestureEnd, false);
			},
			gestureStart(e) {
				if (isDesktop()) {
					tracking = true;
					start.t = new Date().getTime();
					start.x = e.clientX;
					start.y = e.clientY;
				}
			},
			gestureMove(e) {
				if (tracking && isDesktop()) {
					e.preventDefault();
					end.x = e.clientX;
					end.y = e.clientY;
				}
			},
			gestureEnd() {
				if (tracking && isDesktop()) {
					tracking = false;
					let now = new Date().getTime();
					let deltaTime = now - start.t;
					let deltaX = end.x - start.x;
					let deltaY = end.y - start.y;
					if (deltaTime < thresholdTime) {
						if ((deltaY > thresholdDistance) && (Math.abs(deltaX) < thresholdDistance)) {
							setActiveNavItem('up');
						} else if ((-deltaY > thresholdDistance) && (Math.abs(deltaX) < thresholdDistance)) {
							setActiveNavItem('down');
						}
					}
				}
			}
		};
	};

	/**
	 * Init plugins and listeners
	 */
	const init = () => {
		$(document).foundation();
		objectFitImages('img');

		if (isIE11) {
			$body.addClass('ie11');
		}

		$('[data-trigger-on-load]').addClass('js-is-visible');

		$('[data-tooltip]' ).each(function() {
			new Tooltip($(this), {
				placement: 'right-start',
				html: true,
				title: $(this).attr('title'),
				container: 'body'
			});
			$(this).attr('title', '');
		});

		// Nav highlighting during scroll
		$('[data-magellan]').on('update.zf.magellan', (e, elem) => {
			activeNavIndex = elem.closest('li').index();

			handleClosedNavigation();
		});

		// handle opening and closing of main nav
		$mainNavTrigger.on('click', function() {
			toggleNav();
		});

		$mainNavClose.on('click', function() {
			toggleNav();
		});

		$mainNavLinks.on('click', function(e) {
			e.preventDefault();

			activeNavIndex = $(this)
				.closest('.main-nav__cell')
				.index();
			scrollToIndex(activeNavIndex);

			toggleNav();
		});

		// countUp elements
		$('[data-trigger-on-enter^="countUp"]').each(function() {
			const endValue = parseInt($(this).text(), 10);
			const duration = parseFloat($(this).data('countUpDuration')) || 2;
			$(this).data('count-up', new CountUp(this, 0, endValue, 0, duration));
		});

		scrollerEnter = scrollama();
		scrollerEnter.setup({
			step: '[data-trigger-on-enter]',
			offset: 0.8,
			once: true
		}).onStepEnter(handleEnter);

		scrollerCenter = scrollama();
		scrollerCenter.setup({
			step: '[data-trigger-on-center]',
			offset: 0.4,
			once: true
		}).onStepEnter(handleEnter);

		const $chapterLink = $('.chapter-link');
		$chapterLink.on('click', function(e) {
			e.preventDefault();

			$('html, body').animate({
				scrollTop: $($(this).attr('href')).position().top
			}, 1000);
		});

		const initRellax = () => {
			if (!isIE11) {
				rellax = new Rellax('[data-rellax-speed]', {
					center: true,
					vertical: true,
					horizontal: false
				});
			}
		};

		const setSVGsize = () => {
			$book.height($book.width() * 0.55);
		};

		const isDesktop = () => {
			return $(window).width() >= 800;
		};

		const wasDesktop = () => {
			const oldScreenWidth = desktopScreenWidth;
			desktopScreenWidth = $(window).width();
			return oldScreenWidth >= 800 && desktopScreenWidth < 800;
		};

		const wasMobile = () => {
			const oldScreenWidth = mobileScreenWidth;
			mobileScreenWidth = $(window).width();
			return oldScreenWidth < 800 && mobileScreenWidth >= 800;
		};

		const resizeHandler = debounce(() => {
			handleResize();

			if (isIE11) {
				setSVGsize();
			}

			if (wasDesktop() && rellax) {
				rellax.destroy();
			}
			if (wasMobile()) {
				initRellax();
			}
			scrollerEnter.resize();
			scrollerCenter.resize();
		}, 250);

		if (isDesktop()) {
			initRellax();
		}

		if (isIE11) {
			setSVGsize();
		}

		pointerEvents().init();

		// setup resize event
		window.addEventListener('resize', resizeHandler);
	};

	/**
	 * Sets the correct active nav item, is either triggered by wheel or pointer events
	 * @param direction - direction in which the nav should move
	 */
	const setActiveNavItem = (direction) => {
		if (direction === 'up') {
			if (activeNavIndex > 0) {
				activeNavIndex--;
			}
		} else if (direction === 'down') {
			if (activeNavIndex < maxNavItems - 1) {
				activeNavIndex++;
			}
		}
		handleOpenNavigation();
	};

	const isDesktop = () => {
		return window.innerWidth >= 800;
	};

	/**
	 * Handler for wheel events
	 */
	const handleScrollWheel = debounce((e) => {
		if (isDesktop()) {
			if (e.deltaY > 0) {
				setActiveNavItem('down');
			} else {
				setActiveNavItem('up');
			}
		}
	}, 50);

	/**
	 * Set active class for closed navigation during scroll
	 */
	const handleClosedNavigation = () => {
		$mainNav
			.removeClass(function(index, className) {
				return (className.match(/\main-nav--active\S+/g) || []).join(' ');
			})
			.addClass('main-nav--active-' + activeNavIndex);
	};

	/**
	 * Translate the nav up or down when opened depending on what element is active
	 */
	const positionMainNav = () => {
		let totalHeight = 0;

		$mainNavCells.slice(0, activeNavIndex).each(function() {
			totalHeight += $(this).data('height');
		});

		$mainNavGrid.css({
			'-webkit-transform': 'translateY(-' + totalHeight + 'px)',
			'-ms-transform': 'translateY(-' + totalHeight + 'px)',
			transform: 'translateY(-' + totalHeight + 'px)'
		});
	};

	/**
	 * Reposition the main navigation when opened and scroll the page to the correct chapter
	 */
	const handleOpenNavigation = () => {
		if (isDesktop()) {
			positionMainNav();
			scrollToIndex(activeNavIndex);
		}
	};

	/**
	 * Resize event handler
	 */
	const handleResize = () => {
		$mainNav
			.removeClass(function(index, className) {
				return (className.match(/\main-nav--active\S+/g) || []).join(' ');
			})
			.removeClass('main-nav--animation-enabled');

		$mainNavCells.each(function() {
			$(this).data('height', $(this).outerHeight());
		});

		$mainNav.addClass('main-nav--active-' + activeNavIndex);
		window.setTimeout(() => {
			$mainNav.addClass('main-nav--animation-enabled');
		}, 1);

		positionMainNav();
	};

	/**
	 * Scroll the page to the correct chapter
	 * @param index - Index of the current chapter
	 */
	const scrollToIndex = (index) => {
		window.scrollTo(0, $scrollTargets.eq(index).position().top);
	};

	/**
	 * Toggle the main navigation
	 */
	const toggleNav = () => {
		$mainNav.toggleClass('main-nav--open');
		$body.toggleClass('scroll-disabled');
		isOpen = !isOpen;

		if (isOpen) {
			handleResize();
			handleOpenNavigation();
			document.addEventListener('wheel', handleScrollWheel, { passive: true });
		} else {
			document.removeEventListener('wheel', handleScrollWheel, { passive: true });
		}
	};

	// fire events when elements become visible during scroll
	const handleEnter = (e) => {
		if (typeof $(e.element).data('triggerOnCenter') !== 'undefined') {
			$(e.element).addClass('js-is-visible');
		} else {
			switch ($(e.element).data('triggerOnEnter')) {
				case 'countUp':
					$(e.element).data('countUp').start();
					break;
				case 'countUpDelay':
					setTimeout(() => {
						$(e.element).data('countUp').start();
					}, 500);
					break;
				case 'visibilityClass':
					$(e.element).addClass('js-is-visible');
			}
		}
	};

	init();

})(window.jQuery, window, document);
