"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { RichText, combineCollections } from 'readcv';
import { motion, AnimatePresence } from 'framer-motion';
import useResizeObserver from "use-resize-observer";
import '@fontsource-variable/inter';
import { v4 as uuidv4 } from 'uuid';
import { useScrollBoost } from 'react-scrollbooster';

import cv from './cv';

function App() {
  const [animating, setAnimating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentCollection, setCurrentCollection] = useState();
  const [showFullProgress, setShowFullProgress] = useState(false);
  const messagesRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let msgs = [
      {
        type: "received",
        message: <p>Hi! I'm {cv.general.displayName}</p>,
        key: uuidv4(),
      },
      {
        type: "received",
        message: <p>What else would you like to know?</p>,
        key: uuidv4(),
      },
    ]

    if (cv.general.byline) {
      msgs.splice(1, 0, {
        type: "received",
        message: <p>{cv.general.byline}</p>,
        key: uuidv4(),
      });
    }
    addMessages(msgs);

    if (!scrollRef.current) { return }
    
    const onWheel = (e) => {
      if (e.deltaY == 0) return;
      e.preventDefault();
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollLeft + e.deltaY,
      });
    };
    scrollRef.current.addEventListener("wheel", onWheel, { passive: false });
    return () => scrollRef.current.removeEventListener("wheel", onWheel, { passive: false });
  }, []);

  const [viewport, scrollbooster] = useScrollBoost({
    viewportRef: scrollRef,
    direction: 'horizontal',
    friction: 0.05,
    scrollMode: 'native',
    inputsFocus: false,
    onUpdate: (data) => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = data.position.x;
      }
    },
    shouldScroll: () => { return !isMobile() }
  });

  const updateScrollbooster = () => {
    if (!scrollbooster || !scrollRef.current) {
      return;
    }
    scrollbooster.updateMetrics();
  };

  useEffect(() => {
    updateScrollbooster();
  }, []);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  const addMessages = (msgs, reset) => {
    let delay = 800;
    
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      if (reset) {
        setCurrentCollection(undefined);
        setShowFullProgress(false);
      }
    }, msgs.length * delay);
    
    msgs.forEach((message, index) => {
      setTimeout(() => {
        setMessages(prevMessages => [...prevMessages, message]);
      }, index * delay);
    });
  };

  const addCollection = (cannedMessages, collection, index) => {
    let experience = collection.items[index];
    let canned = cannedMessages ?? [];
    let expHeading;
    if (experience.url) {
      expHeading = <a href={experience.url} target="_blank">{experience.heading}</a>
    } else {
      expHeading = experience.heading
    }
    
    let message = [
      {
        type: "received",
        message: <p>{experience.year ? experience.year + ": " : null}{expHeading}</p>,
        key: uuidv4(),
      }
    ];

    let description = [];
    if (experience.description) {
      description = [{
        type: "received",
        message: <RichText text={experience.description}/>,
        key: uuidv4(),
      }]
    }

    let attachment = [];
    if (experience.attachments && experience.attachments.length > 0) {
      attachment = [{
        type: "attachment",
        attachments: experience.attachments,
        key: uuidv4(),
      }];
    }

    let reset = false;
    if (index < collection.items.length - 1) {
      setCurrentCollection({
        collection: collection,
        action: () => {
          addCollection([{
            type: "sent",
            message: <p>{getSeeMore()} {index === collection.items.length - 2 ? "Show me one last" : "Show me your next"} {singularCollectionName(collection.name).toLowerCase()}{index === collection.items.length - 2 ? "?" : "."}</p>,
            key: uuidv4(),
          }], collection, index + 1)
        },
        index: index + 1,
      });
    } else {
      setShowFullProgress(true);
      reset = true;
    }

    addMessages(canned.concat(message, description, attachment), reset);
  }

  const singularCollectionName = (name) => {
    switch(name) {
      case "Writing":
        return "piece of writing"
      case "Volunteering":
        return "volunteer experience"
      case "Speaking":
        return "speaking experience"
      case "Education":
        return "educational experience"
      default: 
        return name.replace(/\b(\w+)s\b/g, "$1");
    }
  }

  const getAffirmation = () => {
    const affirmations = [
      "For sure",
      "Definitely",
      "Of course",
      "No problem",
      "I got you",
    ]
    const randomIndex = Math.floor(Math.random() * affirmations.length);
    return affirmations[randomIndex];
  }

  const getCollectionPrompt = () => {
    const prompts = [
      "Could you share some of your",
      "Show me your",
      "Tell me about your",
    ]
    const randomIndex = Math.floor(Math.random() * prompts.length);
    return prompts[randomIndex];
  }

  const getSeeMore = () => {
    const prompts = [
      "Cool!",
      "Nice!",
      "Neat!",
      "Whoa!",
      "Rad!",
    ]
    const randomIndex = Math.floor(Math.random() * prompts.length);
    return prompts[randomIndex];
  }

  const onResize = () => {
    scrollToBottom();
  }

  useResizeObserver({ ref: messagesRef, onResize });
  
  return (
    <div className="container">
      <div
        ref={messagesRef}
        className="messages">
        <AnimatePresence>
          {messages.map((message, index) => {
            let lastChild = index === messages.length - 1;
            let lastOfType = false;
            if (!lastChild) {
              lastOfType = messages[index + 1].type !== message.type;
            }
  
            if (message.type === "attachment") {
              return (
                <Attachments attachments={message.attachments} key={message.key}/>
              )
            }
            
            return (
              <Bubble
                key={message.key}
                type={message.type}
                showTail={lastChild || lastOfType}
              >
                {message.message}
              </Bubble>
            )
          })}
        </AnimatePresence>
      </div>
      <div className="composer">
        <div
          ref={scrollRef}
          className="scrollableRegion">
          <div className="prompts">
            {cv.general.about ?
              <Prompt
                disabled={animating}
                onClick={() => {
                  setCurrentCollection(undefined);
                  addMessages([
                    {
                      type: "sent",
                      message: <p>Tell me more about yourself</p>,
                      key: uuidv4(),
                    },
                    {
                      type: "received",
                      message: <p>Sure!</p>,
                      key: uuidv4(),
                    },
                    {
                      type: "received",
                      message: <RichText text={cv.general.about}/>,
                      key: uuidv4(),
                    }
                  ], true)
                }}
                label="About"
              />
            : null}
    
            {cv.general.status && cv.general.status.text && cv.general.status.emoji ?
              <Prompt
                disabled={animating}
                onClick={() => {
                  setCurrentCollection(undefined);
                  addMessages([
                    {
                      type: "sent",
                      message: <p>Current status?</p>,
                      key: uuidv4(),
                    },
                    {
                      type: "received",
                      message: <RichText text={cv.general.status.text}/>,
                      key: uuidv4(),
                    },
                    {
                      type: "emoji",
                      message: <RichText text={cv.general.status.emoji}/>,
                      key: uuidv4(),
                    }
                  ], true)
                }}
                label="Status"
              />
            : null}
            {cv.allCollections.map((collection, index) => {
    
              if (collection.name === "Contact") {
                return (
                  <Prompt
                    disabled={animating}
                    label={collection.name}
                    onClick={() => {
                      setCurrentCollection(undefined);
                      addMessages([
                        {
                          type: "sent",
                          message: <p>How can I reach you?</p>,
                          key: uuidv4(),
                        },
                        {
                          type: "received",
                          message: <p>Check out my {cv.contact.map((contactItem, index) => {
                            let punctuation;
                            if (index === cv.contact.length - 1) {
                              punctuation = "."
                            } else if (index === cv.contact.length - 2) {
                              punctuation = ", or "
                            } else {
                              punctuation = ", "
                            }
                            return (
                              <><a href={contactItem.url} target="_blank">{contactItem.platform}</a>{punctuation}</>
                            )
                          })}</p>,
                          key: uuidv4(),
                        },
                      ], true)
                    }}
                  />
                )
              }
          
              return (
                <Prompt
                  disabled={animating}
                  label={collection.name}
                  active={currentCollection && currentCollection.collection.name === collection.name}
                  progress={showFullProgress ? 1 / 1 : currentCollection && currentCollection.collection.name === collection.name ? currentCollection.index / collection.items.length : 0}
                  onClick={() => {
                    if (
                      currentCollection &&
                      currentCollection.action &&
                      currentCollection.collection.name === collection.name
                    ) {
                      currentCollection.action();
                      return;
                    }
                    
                    addCollection([
                      {
                        type: "sent",
                        message: <p>{getCollectionPrompt()} {collection.name.toLowerCase()}?</p>,
                        key: uuidv4(),
                      },
                      {
                        type: "received",
                        message: <p>{getAffirmation()}</p>,
                        key: uuidv4(),
                      },
                    ], collection, 0);
                 }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


function Attachments(props) {
  const [typing, setTyping] = useState(true);
  const [lightboxState, setLightboxState] = useState({
    open: false,
    startingIndex: 0,
  });

  useEffect(() => {
    setTimeout(() => {
      setTyping(false);
    }, 800);
  }, []);

  let lightbox;
  if (lightboxState.open === true) {
    lightbox = <Lightbox
        attachments={props.attachments}
        startingIndex={lightboxState.startingIndex}        
        close={() => setLightboxState({
          open: false,
          startingIndex: 0,
        })}
      />
  }

  let images =
    <>
      {props.attachments.length >= 3 ?
        <div className="numberOfImages">
          {props.attachments.length} attachments
        </div>
      : null}
      <div className={ props.attachments.length === 1 ? "attachmentsOneUp" :
        (props.attachments.length === 2 ? "attachmentsTwoUp" : "attachmentsThreeUp")
      }>
        {props.attachments.map((media, index) => {
          if (index > 2) { return }
          return (
            <Image
              media={media}
              autoplay={props.attachments.length >= 3 && index > 0 ? false : true}
              aspectRatio={props.attachments.length >=3 ? props.attachments[0].width / props.attachments[0].height : media.width / media.height}
              onClick={() => setLightboxState({
                open: true,
                startingIndex: index,
              })}
            />
          )
        })}
      </div>
    </>
  
  return (
    <>
    <motion.div
      initial={{
        opacity: 0,
        y: 40,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 700,
        damping: 50,
      }}
      className="attachments"
    >
      {typing ? 
        <div className="bubble" data-typing="true">
          <div className="loader">
            <div className="dot"/>
            <div className="dot"/>
            <div className="dot"/>
          </div>
        </div>
      :
        <>{images}</>
      }
    </motion.div>
    <AnimatePresence>
      {lightbox}
    </AnimatePresence>
    </>
  )
}

function Image(props) {
  let attachment = props.media.type === "image" ?
    <img src={props.media.url}/> :
    <video
      src={props.media.url + "#t=0.1"}
      autoPlay={props.autoplay}
      muted
      playsInline
      loop/>
  return (
    <div
      style={{
        aspectRatio: props.aspectRatio
      }}
      onClick={props.onClick}
      className="image">
      {attachment}
    </div>
  )
}


function Bubble(props) {
  const [typing, setTyping] = useState(props.type === "received" || props.type === "emoji" ? true : false);

  useEffect(() => {
    setTimeout(() => {
      setTyping(false);
    }, 800);
  }, []);
  
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 40,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 700,
        damping: 50,
      }}
      className="bubble"
      data-type={props.type}
      data-tail={props.showTail}
      data-typing={props.showTail && typing}
    >
      {typing ? 
        <div className="loader">
          <div className="dot"/>
          <div className="dot"/>
          <div className="dot"/>
        </div>
      : props.children}
    </motion.div>
  );
}


function Lightbox(props) {
  const [currentIndex, setCurrentIndex] = useState(props.startingIndex);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current && isMobile() && props.startingIndex > 0) {
      let bounds = scrollRef.current.getBoundingClientRect();
      scrollRef.current.scrollLeft = bounds.width * props.startingIndex;
    }
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  const handleKey = (event) => {
    if (event.key === 'Escape') {
      props.close();
    }
    
    if (event.key === "ArrowRight") {
      next();
    }
    
    if (event.key === "ArrowLeft") {
      prev();
    }
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const next = () => {
    setCurrentIndex(currentIndex => {
      if (currentIndex < props.attachments.length - 1) {
        return currentIndex + 1;
      } else {
        return 0;
      }
    });
  }
    
  const prev = () => {
    setCurrentIndex(currentIndex => {
      if (currentIndex === 0) {
        return props.attachments.length - 1;
      } else {
        return currentIndex - 1;
      }
    });
  }

  const handleScroll = (event) => {
    if (!props.attachments) { return }
    let view = event.currentTarget;
    setCurrentIndex(currentIndex => {
      let index = Math.round((view.scrollLeft / (view.scrollWidth - view.offsetWidth)) * (props.attachments.length -1));
      return index
    });
  }
  
  return ReactDOM.createPortal(
      <div
        data-mobile={isMobile()}
        className="lightbox">
        <div
          onScroll={(event) => handleScroll(event)}
          ref={scrollRef}
          className="carouselScroll">
          <div className="carousel">
            {props.attachments.map((media, index) => {
              return (
                <LightboxImage
                  prev={props.attachments && props.attachments.length > 1 ? prev : undefined}
                  next={props.attachments && props.attachments.length > 1 ? next : undefined}
                  key={media.url}
                  display={currentIndex === index || isMobile() ? true : false}
                  media={media}
                />
              )
            })}
          </div>
        </div>
        
        {props.attachments && props.attachments.length > 1 ?
          <motion.div
            initial={{ 
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 700,
              damping: 50,
            }}
            className="dots">
            {props.attachments.map((media, index) => {
              return (
                <div
                  className="pagerDot"
                  data-active={currentIndex === index}
                  key={media.url + "dot"}/>
              )
            })}
          </motion.div>
        : null}

        <motion.div
          initial={{ 
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 50,
          }}
          className="backdrop"
          onClick={() => props.close()}/>
        <motion.button
          initial={{ 
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          whileTap={{ scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 50,
          }}
          className="close"
          onClick={() => props.close()}/>
      </div>
    , document.body);
}

function LightboxImage(props) {
  const containerRef = useRef(null);
  const [containerAspectRatio, setContainerAspectRatio] = useState((window.innerWidth - 48) / (window.innerHeight - 96));
  const imageAspectRatio = props.media.width / props.media.height;
  
  let attachment = props.media.type === "image" ?
    <img src={props.media.url}/> :
    <video
      src={props.media.url}
      autoPlay
      muted
      playsInline
      loop/>

  useEffect(() => {
    setRatio();
  }, []);

  
  const setRatio = () => {
    if (!containerRef.current) { return }
    let bounds = containerRef.current.getBoundingClientRect();
    setContainerAspectRatio(bounds.width / bounds.height);
  }
  
  const onResize = () => {
    setRatio();
  }

  useResizeObserver({ ref: containerRef, onResize });
  
  return (
    <div
      className="lightboxImage"
      style={{
        visibility: props.display ? "visible" : "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{
          type: 'spring',
          stiffness: 700,
          damping: 50,
        }}
        ref={containerRef}
        className="lightboxInner">
        <div
          className="imageWrap"
          style={{
            pointerEvents: props.display ? "all" : "none",
            aspectRatio: imageAspectRatio,
            width: containerAspectRatio > imageAspectRatio ? "auto" : "100%",
            height: containerAspectRatio > imageAspectRatio ? "100%" : "auto",
          }}
        >
          {props.prev && props.next && !isMobile() ?
            <div
              className="navigation">
              <button className="prev" onClick={() => props.prev()} />
              <button className="next" onClick={() => props.next()} />
            </div>
          : null}
          {attachment}
        </div>
      </motion.div>
    </div>
  )
}

let isMobileValue = null;
function isMobile() {
  // When rendering on the server, return false and do not cache the value.
  if (typeof window === 'undefined') {
    return false;
  }

  if (isMobileValue === null) {
    const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    if ('ontouchstart' in window) {
      isMobileValue = true;
    } else {
      const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
      isMobileValue = window.matchMedia(query).matches;
    }
  }
  return isMobileValue;
}


function Prompt(props) {

  let progressBar;
  if (props.active) {
    progressBar = <div className="progressBarWrap">
        <motion.div
          className="progressBar"
          initial={{
            width: "0%",
          }}
          animate={{
            width: (props.progress * 100) + "%",
          }}
          transition={{
            type: 'spring',
            stiffness: 700,
            damping: 50,
          }}
        />
      </div>
  }
  return (
    <motion.button
      whileTap={{ scale: props.disabled ? 1 : 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 700,
        damping: 50,
      }}
      disabled={props.disabled}
      data-active={props.active}
      className="prompt"
      onClick={props.onClick}
    >
      <AnimatePresence>
        {progressBar}
      </AnimatePresence>
      <motion.span
        animate={{ opacity: props.disabled ? 0.3 : 1 }}
      >
       {props.label}
      </motion.span>
    </motion.button>
  );
}


export default App;