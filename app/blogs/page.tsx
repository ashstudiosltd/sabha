"use client";
import React from 'react'
import BlogsPage from './blogspage';
import Footer from './footer';
import Nav from '../sabha/nav';
const blog= () => {
  return (
    <>
  <Nav/>
  <BlogsPage/>
  <Footer/>
    </>
  )
}

export default blog