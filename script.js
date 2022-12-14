function watchPageMainScrollableContainerForRenders() {
    new MutationObserver((mutations, observer) => {
        mutations.forEach(mut => {
            if (mut.type === "childList" && mut.addedNodes.length) {
                for (let node of mut.addedNodes) {
                    // we track only elements, skip other nodes (e.g. text nodes)
                    if (!(node instanceof HTMLElement)) continue;

                    if (node.matches("[class*=PageContent-pageContentScroller]") || node.matches("[class*=Page-pageScroller]")) {
                        waitForElm("a[aria-label]", true, node)
                            .then(addRatingBadgesToDOM)
                            .catch(e => { console.warn(e) })

                        if (!node.hasAttribute('scroll-listener')) {
                            node.setAttribute('scroll-listener', '')
                            node.addEventListener('scroll', () => {
                                waitForElm("a[aria-label]", true, node)
                                    .then((title) => {
                                        if (title[0].getAttribute('aria-label') === 'The Shawshank Redemption, 1994')
                                            console.log(title)
                                        return title;
                                    })
                                    .then(addRatingBadgesToDOM)
                                    .catch(e => { console.warn(e) })
                            })
                        }
                    }
                }
            }
        })
    }).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,

    });
}
watchPageMainScrollableContainerForRenders()

function waitForElm(selector, all, container = undefined, rejectTime = 10000) {
    return new Promise((resolve, reject) => {
        let timeout;
        new MutationObserver((_m, observer) => {

            if (all) {
                const els = container ? container.querySelectorAll(selector) : document.querySelectorAll(selector)
                if (els.length > 0) {
                    observer.disconnect();
                    clearTimeout(timeout);
                    return resolve(els);
                }
            } else {
                const el = container ? container.querySelector(selector) : document.querySelector(selector)
                if (el) {
                    observer.disconnect();
                    clearTimeout(timeout);
                    return resolve(el);
                }
            }
            timeout = setTimeout(() => {
                observer.disconnect();
                clearTimeout(timeout);
                return reject('Timed out while waiting for element(s).');
            }, rejectTime);

        }).observe(container || document.body || document.documentBody, {
            childList: true,
            subtree: true
        });
    });
}

// Intercept and store Plex metadata from XHR requests
const meta = {};
const interceptPlexData = () => {
    let oldXHROpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function () {
        this.addEventListener("load", async function () {
            const regex = /library\/(sections|collections)\/.*\/(all|children)/
            const searchAndRecentlyAddedRegex = /hubs\/(sections|search|home\/recentlyAdded)\.*/
            const seasonEpisodesRegex = /library\/metadata\/.*\/children/
            const similarRegex = /library\/metadata\/.*\/similar/
            const relatedRegex = /library\/metadata\/.*\/related/

            if (this.responseURL.match(regex) ||
                this.responseURL.match(searchAndRecentlyAddedRegex) ||
                this.responseURL.match(seasonEpisodesRegex) ||
                this.responseURL.match(similarRegex) ||
                this.responseURL.match(relatedRegex)) {

                const responseBody = this.responseText;

                if (this.responseURL.match(regex)) {
                    JSON.parse(responseBody)?.MediaContainer?.Metadata?.forEach(async (item, i) => {
                        if (item.type === 'movie')
                            addRatings(item.title + ", " + item.year, item)
                        if (item.type === 'episode')
                            addRatings(item.grandparentTitle + ", " + item.parentTitle + " Episode " + item.index + ", " + item.title, item)
                        if (item.type === "show") {
                            addRatings(item.title + ", Season " + item.index)
                        }
                    })

                }
                if (this.responseURL.match(seasonEpisodesRegex)) {
                    JSON.parse(responseBody).MediaContainer.Metadata.forEach(async (tv, i) => {
                        addRatings(tv.grandparentTitle + ", " + tv.parentTitle + " Episode " + tv.index + ", " + tv.title, tv)
                    })
                }

                if (this.responseURL.match(relatedRegex)) {
                    const hubs = JSON.parse(responseBody).MediaContainer?.Hub || null
                    if (hubs) {
                        hubs.forEach((hub) => {
                            if (hub.context?.includes("hub.tv")) {
                                hub.Metadata?.forEach((tv, i) => {
                                    if (tv.type === "episode") {
                                        addRatings(tv.grandparentTitle + ", Episode " + tv.index + ", " + tv.title, tv)
                                    }
                                    if (tv.type === "show") {
                                        addRatings(tv.title, tv)
                                    }
                                    if (tv.type === "season") {
                                        addRatings(tv.parentTitle + ", " + tv.title, tv)
                                    }
                                })
                            }
                            if (hub.context?.includes("hub.movie")) {
                                hub.Metadata?.forEach((movie, i) => {
                                    addRatings(movie.title + ", " + movie.year, movie)
                                })
                            }
                        })
                    }
                }

                if (this.responseURL.match(similarRegex)) {
                    if (this.getResponseHeader('Content-Type')?.includes('application/json')) {
                        JSON.parse(responseBody).MediaContainer.Metadata.forEach(async (item, i) => {
                            if (item.type === 'movie') {
                                addRatings(item.title + ", " + item.year, item)
                            }
                            if (item.type === 'show') {
                                addRatings(item.title, item)
                            }
                            if (item.type === "episode") {
                                addRatings(item.grandparentTitle + ", Episode " + item.index + ", " + item.title, item)
                            }
                            if (item.type === "season") {
                                addRatings(item.parentTitle + ", " + item.title, item)
                            }
                        })
                    }
                }

                if (this.responseURL.match(searchAndRecentlyAddedRegex)) {
                    const hubs = JSON.parse(responseBody).MediaContainer?.Hub || null
                    if (hubs) {
                        hubs.forEach((hub) => {
                            if (hub.context?.includes("hub.tv")) {
                                hub.Metadata?.forEach((tv, i) => {
                                    if (tv.type === "episode") {
                                        addRatings(tv.grandparentTitle + ", " + tv.parentTitle + " Episode " + tv.index + ", " + tv.title, tv)
                                    }
                                    if (tv.type === "show") {
                                        addRatings(tv.title, tv)
                                    }
                                    if (tv.type === "season") {
                                        addRatings(tv.parentTitle + ", " + tv.title, tv)
                                    }
                                })
                            }
                            if (hub.context?.includes("hub.movie")) {
                                hub.Metadata?.forEach((movie, i) => {
                                    addRatings(movie.title + ", " + movie.year, movie)
                                })
                            }
                        })
                    }
                }

                setScrollableContainerEventListeners('DirectoryListPageContent-pageContentScroller')
                if (this.responseURL.match(searchAndRecentlyAddedRegex) ||
                    this.responseURL.match(seasonEpisodesRegex) ||
                    this.responseURL.match(similarRegex) ||
                    this.responseURL.match(relatedRegex)) {
                    setScrollableContainerEventListeners('PageContent-pageContentScroller')
                    // Get horizontal scroll area containers, filter out containers for Cast and Reviews as they don't have ratings
                    waitForElm("div[class*=" + 'VirtualHubScroller-hubScroller' + "]", true)
                        .then((containers) => {
                            return Array.from(containers).filter((container) => {
                                return Array.from(container.parentNode.parentNode.querySelectorAll("[class*='HubTitle-hubTitle']"))[0].outerText !== ('Cast' || 'Reviews')
                            })
                        })
                        .then((containers) => { setScrollableContainerEventListeners('VirtualHubScroller-hubScroller', containers) })
                        .catch(e => { console.warn(e) })
                }
            }
        })
        return oldXHROpen.apply(this, arguments);
    }
}
interceptPlexData()

async function setScrollableContainerEventListeners(scrollableContainerSelector, containers) {
    try {
        const scrollableContainer = await waitForElm("div[class*=" + scrollableContainerSelector + "]", true) || [];
        Array.from(containers ? containers : scrollableContainer).filter((container) => { return !container.hasAttribute('scroll-listener') }).forEach((scroller) => {
            scroller.setAttribute('scroll-listener', '')
            scroller.addEventListener('scroll', () => {
                waitForElm("a[aria-label]", true, scroller)
                    .then(addRatingBadgesToDOM)
                    .catch(e => { console.warn(e) })
            })
        })
    } catch (e) { console.warn(e) }
}

const audienceRatingGood = `<svg aria-hidden="true" class="_11ni0ce26 _11ni0ceb p0ac3m1 p0ac3m3 p0ac3ma" fill="currentColor" height="48" viewBox="0 0 42 48" width="42" xmlns="http://www.w3.org/2000/svg"><path d="M10.2693 38.2524L7.68896 18.5139C8.60882 19.2949 9.85756 19.8396 11.1372 20.2506L13.1485 40.6469C11.972 40.0404 10.8478 39.1308 10.2693 38.2524Z" fill="white"></path><path d="M31.6422 38.2524C31.0639 39.1308 29.9397 40.0404 28.7632 40.6469L30.7745 20.2506C32.0541 19.8396 33.3029 19.2949 34.2227 18.5139L31.6422 38.2524Z" fill="white"></path><path d="M26.7617 41.4977C24.8139 42.1421 23.6816 42.3419 22.0605 42.501L22.3131 21.5415C24.104 21.4901 26.4217 21.2475 28.3963 20.826L26.7617 41.4977Z" fill="white"></path><path d="M13.5154 20.826L15.15 41.4977C17.0978 42.1421 18.2301 42.3419 19.8512 42.501L19.5986 21.5415C17.8077 21.4901 15.49 21.2475 13.5154 20.826Z" fill="white"></path><path d="M7.19186 13.4953C7.30819 15.9662 13.4294 17.9247 20.9557 17.8818C27.5289 17.8443 33.0122 16.2922 34.3553 14.253C34.0492 13.913 33.6265 13.6797 33.1504 13.6165C33.1555 13.5565 33.1588 13.496 33.1585 13.4346C33.153 12.4575 32.436 11.6528 31.5019 11.5027C31.5266 11.3763 31.5395 11.2456 31.5387 11.1119C31.5326 10.0236 30.6451 9.14657 29.5567 9.15273C29.5321 9.15288 29.5081 9.15588 29.4836 9.15693C29.5532 8.95342 29.5923 8.73595 29.5911 8.50888C29.5848 7.42066 28.6975 6.54359 27.6091 6.54974C27.3593 6.55124 27.1217 6.60092 26.9022 6.68692C26.5909 6.10101 25.9932 5.69264 25.2962 5.64551C25.1748 4.66835 24.3399 3.9145 23.3307 3.9202C22.6956 3.9238 22.1339 4.22876 21.7762 4.69716C21.4134 4.30245 20.8934 4.05482 20.3151 4.05812C19.2267 4.06427 18.3494 4.95155 18.3556 6.03962C18.3568 6.24748 18.3906 6.44724 18.4512 6.63499C18.007 6.71738 17.6165 6.94821 17.331 7.27433C17.1043 6.43028 16.3335 5.81 15.4183 5.8151C14.5633 5.82006 13.8407 6.36965 13.5723 7.1322C12.8459 7.42591 12.3347 8.13834 12.3395 8.96933C12.3405 9.15393 12.3687 9.33162 12.4172 9.50091C12.1723 9.39375 11.9022 9.33372 11.6176 9.33537C10.7594 9.34033 10.0346 9.89382 9.76844 10.6609C9.51326 10.5423 9.22956 10.4749 8.9295 10.4767C7.84107 10.4829 6.9637 11.37 6.97 12.4582C6.97196 12.8171 7.07148 13.152 7.2408 13.4408C7.22353 13.4582 7.20837 13.4773 7.19186 13.4953Z" fill="#FFD700"></path><path clip-rule="evenodd" d="M31.5387 11.1114C31.538 10.9792 31.5237 10.8504 31.4982 10.7258C34.2616 11.762 36.1411 13.2199 35.9888 14.8259C35.9814 14.9332 32.8005 37.704 32.8005 37.704C32.4336 41.3104 27.1955 44.1928 20.9559 44.2286C14.7163 44.1928 9.47829 41.3104 9.11127 37.704C9.11127 37.704 5.93037 14.9332 5.92301 14.8259C5.84631 14.0229 6.28237 13.4715 7.00303 12.7876C7.04446 13.0219 7.12461 13.2427 7.2408 13.4408C7.23043 13.4511 7.22082 13.4622 7.21122 13.4733C7.20483 13.4806 7.19846 13.488 7.19186 13.4951C7.30834 15.9662 13.4295 17.9245 20.9559 17.8815C27.5289 17.8438 33.0123 16.2917 34.3553 14.2524C34.0492 13.9123 33.6265 13.6791 33.1504 13.6159C33.1555 13.556 33.1588 13.4954 33.1585 13.4342C33.153 12.4568 32.436 11.6521 31.5018 11.5022C31.5265 11.3758 31.5395 11.2451 31.5387 11.1114ZM10.2695 38.2524L7.689 18.5139C8.60886 19.2949 9.8576 19.8396 11.1373 20.2506L13.1485 40.6469C11.972 40.0404 10.8478 39.1308 10.2695 38.2524ZM31.6424 38.2524C31.0639 39.1308 29.9398 40.0404 28.7632 40.6469L30.7745 20.2506C32.0542 19.8396 33.3029 19.2949 34.2227 18.5139L31.6424 38.2524ZM26.7617 41.4977C24.8141 42.1421 23.6817 42.3419 22.0605 42.501L22.3131 21.5415C24.1041 21.4901 26.4217 21.2474 28.3965 20.826L26.7617 41.4977ZM13.5154 20.826L15.1501 41.4977C17.0978 42.1421 18.2301 42.3419 19.8513 42.501L19.5986 21.5415C17.8077 21.4901 15.4901 21.2474 13.5154 20.826Z" fill="#FA320A" fill-rule="evenodd"></path></svg>`
const audienceRatingPoor = `<svg aria-hidden="true" class="_11ni0ce26 _11ni0ceb p0ac3m1 p0ac3m3 p0ac3ma" fill="currentColor" height="48" viewBox="0 0 52 48" width="52" xmlns="http://www.w3.org/2000/svg"><path d="M10.9776 16.4071L30.7147 13.825C29.9339 14.7456 29.3891 15.9951 28.9782 17.2756L8.58308 19.2882C9.18951 18.1109 10.0992 16.986 10.9776 16.4071Z" fill="white"></path><path d="M28.4027 19.6551L7.73235 21.2908C7.08794 23.2399 6.88835 24.373 6.72913 25.9952L27.6873 25.7423C27.7388 23.9503 27.9815 21.631 28.4027 19.6551Z" fill="white"></path><path d="M6.72913 28.2058L27.6873 28.4587C27.7388 30.2507 27.9815 32.57 28.4027 34.5459L7.73235 32.9102C7.08794 30.9611 6.88835 29.828 6.72913 28.2058Z" fill="white"></path><path d="M10.9776 37.794C10.0992 37.2152 9.18951 36.0902 8.58308 34.9129L28.9782 36.9256C29.3891 38.206 29.9339 39.4557 30.7147 40.3761L10.9776 37.794Z" fill="white"></path><path d="M30.8485 34.6857C31.1189 34.0153 32.0774 33.6069 32.7656 33.6547C33.5012 33.7057 34.2827 34.4797 34.4192 35.241C34.4446 35.2133 34.4711 35.1872 34.4982 35.1615C34.7344 34.9356 35.0303 34.7857 35.3542 34.7444C35.3046 34.5248 35.2928 34.2897 35.3267 34.0485C35.4463 33.1998 36.1267 32.5634 36.9057 32.5697C37.4085 32.5738 37.8495 32.8312 38.1369 33.2267C38.1626 33.1946 38.1909 33.1651 38.2185 33.1351C38.5472 31.4216 38.7555 29.4856 38.8029 27.4311C38.9657 20.3665 37.175 14.5951 34.8033 14.5404C32.4314 14.4856 30.3766 20.1681 30.2138 27.2327C30.2138 27.2327 30.0882 29.8094 30.8485 34.6857Z" fill="#00641E"></path><path d="M46.9066 42.4113C47.0468 42.1772 47.1251 41.8964 47.1197 41.5981C47.1652 40.6343 46.5042 39.7605 45.5844 39.8573C45.6109 39.747 45.6283 39.6324 45.6351 39.5142C45.6902 38.5487 45.0249 37.7166 44.1491 37.6557C44.1299 37.6545 44.111 37.6539 44.0919 37.6533C44.183 37.4138 44.2282 37.1462 44.2121 36.8628C44.1668 36.0595 43.6133 35.3827 42.8933 35.2495C42.6332 35.2014 42.381 35.2253 42.15 35.3053C41.9318 34.7673 41.4736 34.3682 40.9163 34.2839C40.8722 33.4104 40.2417 32.6913 39.43 32.635C38.9196 32.5996 38.4506 32.8342 38.137 33.227C37.8496 32.8315 37.4085 32.5742 36.9058 32.5701C36.1268 32.5637 35.4464 33.2001 35.3268 34.0489C35.2928 34.29 35.3047 34.525 35.3542 34.7448C35.0304 34.7859 34.7344 34.936 34.4982 35.1617C34.4712 35.1874 34.4446 35.2136 34.4193 35.2412C34.2827 34.48 33.5013 33.7061 32.7657 33.6549C32.0774 33.6071 31.1065 34.0256 30.8485 34.6859C30.9617 35.8374 31.6808 38.9762 34.2818 41.7919L34.3049 41.7936C34.5557 42.0207 34.8832 42.1458 35.2322 42.1147C35.4486 42.0953 35.6479 42.0178 35.8196 41.8982L35.8615 41.9011C36.0903 42.0602 36.3654 42.1434 36.6561 42.1175C36.7671 42.1076 36.8731 42.0809 36.9738 42.0427C37.2229 42.5582 37.7785 42.8914 38.3986 42.8367C38.8788 42.7944 39.287 42.5285 39.5269 42.1543L39.6047 42.1598C39.8443 42.3975 40.1629 42.536 40.5066 42.5257C40.7907 42.9558 41.3125 43.2205 41.8883 43.1699C42.1051 43.1508 42.3076 43.088 42.4881 42.9929C42.7893 43.3638 43.2836 43.5843 43.826 43.5365C44.3622 43.4895 44.8151 43.192 45.0615 42.7805C45.3036 42.9751 45.6069 43.0795 45.9289 43.0508C46.2414 43.0228 46.519 42.8752 46.7276 42.6518L46.7624 42.6542C46.8098 42.5854 46.8504 42.515 46.888 42.4439C46.8889 42.4426 46.8897 42.4411 46.8904 42.4397C46.8955 42.4303 46.9018 42.421 46.9066 42.4113Z" fill="#FFD700"></path><path clip-rule="evenodd" d="M34.2295 12.0576C35.0336 11.9646 35.9722 12.68 37.2798 14.2038C39.587 17.0795 41.097 24.7821 39.6566 32.6704C39.5828 32.6534 39.5074 32.6403 39.43 32.6348C39.0092 32.605 38.5563 32.7622 38.2186 33.1351C38.5473 31.4216 38.7556 29.4856 38.803 27.4311C38.9658 20.3666 37.1751 14.5951 34.8033 14.5403C32.4315 14.4856 30.3767 20.1682 30.2139 27.2327C30.2139 27.2327 30.0883 29.8095 30.8485 34.6857C30.9617 35.8371 31.6808 38.9761 34.2819 41.7917L34.305 41.7933C34.4462 41.9213 34.6123 42.0152 34.7924 42.0688C34.6074 42.1163 34.4196 42.1418 34.2295 42.143C34.1222 42.1356 11.3529 38.9527 11.3529 38.9527C7.74658 38.5854 4.86433 33.3441 4.82861 27.1004C4.86433 20.8565 7.74658 15.6152 11.3529 15.2481C11.3529 15.2481 34.0796 12.0767 34.2295 12.0576ZM28.9782 17.2754L8.58308 19.288C9.18951 18.1107 10.0992 16.9858 10.9776 16.4069L30.7147 13.8248C29.9339 14.7454 29.3891 15.9949 28.9782 17.2754ZM30.7147 40.3759L10.9776 37.7937C10.0992 37.215 9.18951 36.0899 8.58308 34.9128L28.9782 36.9254C29.3891 38.2057 29.9339 39.4554 30.7147 40.3759ZM6.72913 28.2056C6.88835 29.8279 7.08794 30.9609 7.73234 32.91L28.4027 34.5457C27.9815 32.5698 27.7388 30.2505 27.6873 28.4585L6.72913 28.2056ZM7.73234 21.2906L28.4027 19.6549C27.9815 21.6308 27.7388 23.9501 27.6873 25.7422L6.72913 25.995C6.88835 24.3728 7.08794 23.2397 7.73234 21.2906Z" fill="#04A53C" fill-rule="evenodd"></path></svg>`

const ratingGood = `<svg aria-hidden="true" class="_11ni0ce26 _11ni0ceb p0ac3m1 p0ac3m3 p0ac3ma" fill="currentColor" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg"><path d="M40.9963 25.4551C40.6543 19.9723 37.866 15.8702 33.6705 13.5769C33.6943 13.7105 33.5754 13.8775 33.44 13.8184C30.6959 12.6179 26.0405 16.503 22.7873 14.4685C22.8118 15.1986 22.6692 18.7604 17.6518 18.967C17.5334 18.9718 17.4682 18.8509 17.5431 18.7652C18.2141 17.9999 18.8916 16.0623 17.9174 15.0293C15.8313 16.8986 14.6198 17.6022 10.6199 16.6738C8.0589 19.3516 6.60771 23.0167 6.89259 27.5823C7.47383 36.9024 16.2037 42.2299 24.9949 41.6813C33.7854 41.1332 41.5777 34.7752 40.9963 25.4551Z" fill="#FA320A"></path><path d="M24.975 11.3394C26.7814 10.9089 31.9772 11.2975 33.6419 13.5058C33.7418 13.6382 33.6011 13.8888 33.44 13.8185C30.6958 12.618 26.0405 16.503 22.7873 14.4686C22.8117 15.1987 22.6691 18.7605 17.6518 18.9671C17.5333 18.9719 17.4682 18.851 17.5431 18.7653C18.2141 18 18.8914 16.0623 17.9174 15.0294C15.645 17.0657 14.4131 17.7201 9.48091 16.3869C9.31949 16.3434 9.37452 16.084 9.54625 16.0185C10.4784 15.6622 12.5903 14.1019 14.5883 13.4141C14.9687 13.2833 15.3479 13.1817 15.718 13.1227C13.5181 12.9261 12.5265 12.6202 11.1272 12.8312C10.9739 12.8543 10.8697 12.6758 10.9648 12.5534C12.85 10.125 16.323 9.39163 18.4658 10.6817C17.145 9.04509 16.1104 7.73988 16.1104 7.73988L18.5619 6.34741C18.5619 6.34741 19.5747 8.61027 20.3117 10.2572C22.1353 7.56272 25.5282 7.31403 26.9618 9.22579C27.0468 9.33939 26.9579 9.50096 26.8159 9.49758C25.6492 9.46918 25.0067 10.5304 24.958 11.3375L24.975 11.3394Z" fill="#00912D"></path></svg>`
const ratingPoor = `<svg aria-hidden="true" class="_11ni0ce26 _11ni0ceb p0ac3m1 p0ac3m3 p0ac3ma" fill="currentColor" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg"><path d="M38.1588 38.1158C31.3557 38.473 29.9656 30.6884 27.2966 30.7439C26.1592 30.7677 25.2629 31.9568 25.6565 33.3426C25.873 34.1045 26.4735 35.2218 26.8518 35.9151C28.1863 38.3616 26.2134 41.1303 23.9047 41.3645C20.068 41.7537 18.4676 39.528 18.5666 37.2496C18.6779 34.6919 20.8466 32.0784 18.6223 30.9663C16.2913 29.8009 14.3964 34.3582 12.1658 35.3754C10.147 36.2961 7.34451 35.5822 6.34819 33.3404C5.6484 31.7651 5.77566 28.7318 8.8914 27.5744C10.8376 26.8516 15.1747 28.5198 15.3971 26.4068C15.6536 23.9711 10.8409 23.7657 9.39193 23.1816C6.82803 22.1484 5.31477 19.9374 6.5004 17.5655C7.38998 15.7863 10.0074 15.0624 12.0052 15.8418C14.3986 16.7754 14.7828 19.2578 16.009 20.2901C17.0653 21.1799 18.511 21.2912 19.4565 20.6795C20.1537 20.2282 20.3858 19.2371 20.1228 18.3318C19.7738 17.1299 18.8478 16.3799 17.9443 15.645C16.3365 14.338 14.0666 13.2141 15.4396 9.64644C16.5651 6.7227 19.866 6.61739 19.866 6.61739C21.1775 6.46991 22.3519 6.86591 23.3089 7.72091C24.5883 8.86391 24.8375 10.3917 24.6234 12.0216C24.4278 13.5095 23.9012 14.8126 23.6266 16.2867C23.308 17.9981 24.2227 19.7226 25.9622 19.7898C28.2502 19.8782 28.9363 18.1195 29.2162 17.0048C29.6261 15.3738 30.1641 13.8595 31.6778 12.9059C33.8503 11.5371 36.868 11.8371 38.268 14.4678C39.3755 16.5493 39.0199 19.4148 37.3211 20.9795C36.559 21.6813 35.6426 21.9288 34.6513 21.9357C33.2298 21.9458 31.8089 21.9109 30.4893 22.5761C29.5911 23.0288 29.1997 23.7665 29.1998 24.7552C29.1998 25.7189 29.7015 26.3482 30.5143 26.7578C32.0452 27.5294 33.7352 27.6872 35.389 27.9768C37.7872 28.3968 39.8959 29.2415 41.2497 31.467C41.2619 31.4866 41.2737 31.5063 41.2852 31.5262C42.84 34.1612 41.214 37.9552 38.1588 38.1158Z" fill="#0AC855"></path></svg>`

async function addRatings(title, item) {
    // Add the item data from the GET request to our data store and update the DOM
    if (!meta[title])
        meta[title] = item;
    waitForElm("a[aria-label='" + CSS.escape(title) + "']", true)
        .then(addRatingBadgesToDOM)
        .catch(e => { console.warn(e) })
}

function addRatingBadgesToDOM(items) {
    Array.from(items).forEach((item) => {
        const title = item.getAttribute('aria-label')
        if (title && (item.parentNode.className.includes('MetadataPosterListItem') || item.parentNode.className.includes('ListRow-row'))) {
            if (item.parentNode.getElementsByClassName(title + '_rating').length < 1 && meta[title]?.rating) {
                const rating = document.createElement('div');
                rating.className = title + '_rating'

                const ratingText = document.createElement('span')
                ratingText.className = 'rating-text';
                ratingText.innerText = meta[title].rating * 10 + '%' || '';

                const icon = document.createElement('div')
                icon.className = "rating-icon"
                icon.innerHTML = meta[title].rating < 6 ? ratingPoor : ratingGood;
                rating.prepend(ratingText)
                rating.prepend(icon)
                if (item.nextSibling?.className.includes('MetadataDetailsRow-overlay'))
                    item.nextSibling.firstChild.firstChild.nextSibling.firstChild.appendChild(rating)
                else {
                    item.parentNode.insertBefore(rating, item.parentNode.lastChild);

                }
            }

            if (item.parentNode.getElementsByClassName(title + '_audienceRating').length < 1 && meta[title]?.audienceRating) {
                const audienceRating = document.createElement('div');
                audienceRating.className = title + '_audienceRating'

                const audienceRatingText = document.createElement('span')
                audienceRatingText.className = 'rating-text';
                audienceRatingText.innerText = meta[title].audienceRating * 10 + '%' || '';

                const icon = document.createElement('div')
                icon.className = "rating-icon"
                if (!meta[title]?.rating) audienceRating.style = 'top: 0;'
                icon.innerHTML = meta[title].audienceRating < 6 ? audienceRatingPoor : audienceRatingGood;
                audienceRating.prepend(audienceRatingText)
                audienceRating.prepend(icon)
                if (item.nextSibling?.className.includes('MetadataDetailsRow-overlay'))
                    item.nextSibling.firstChild.firstChild.nextSibling.firstChild.appendChild(audienceRating)
                else
                    item.parentNode.insertBefore(audienceRating, item);
            }
        }
    })
}
