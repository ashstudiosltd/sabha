"use client";
import React, { useState } from 'react'
import BlogsPage from './blogspage';
import Footer from './footer';
import BlogNavbar from './blognav';
const blog= () => {
  const [query, setQuery] = useState('');

  return (
    <>
  <BlogNavbar query={query} onQueryChange={setQuery}/>
  <BlogsPage/>
  <Footer/>
    </>
  )
}

export default blog